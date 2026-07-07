import React from 'react'
import {useEffect} from "react"
/**
 * Agent.jsx
 * AI TV show recommendation chat widget.
 *
 * - Calls Supabase edge function with full conversation history
 * - Uses user's watched list to avoid recommending shows watched already
 * - Logged-in users only
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router';
import SendIcon  from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import ChatBubbleOutlineOutlinedIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import { CircularProgress } from '@mui/material';

import { useAuth }     from '../AuthContext';
import { useTracking } from '../ShowTrackingContext';
import { supabase }    from '../supabase';

// ── Constants ──────────────────────────────────────────────────────────────────

const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL;

const INITIAL_MESSAGE = {
    role:    'model',
    content: "Hey! What are we in the mood for today? Let me know the vibes, genre, or a show you loved and I'll find your next watch.",
};

// ── Sub-components ─────────────────────────────────────────────────────────────

/**
 * Format Gemini response
 */
const FormattedText = ({ content }) => {
    const parseBold = (text) =>
        text.split(/\*\*(.*?)\*\*/g).map((part, i) =>
            i % 2 === 1
                ? <strong key={i} className="font-semibold text-white">{part}</strong>
                : part
        );

    const renderParagraph = (para, pIdx) => {
        const lines = para.split('\n').filter(Boolean);

        const isBullet   = lines.every((l) => /^[-*•]\s/.test(l));
        const isNumbered = lines.every((l) => /^\d+\.\s/.test(l));

        if (isBullet) {
            return (
                <ul key={pIdx} className="space-y-1.5 pl-1">
                    {lines.map((line, i) => (
                        <li key={i} className="flex gap-2 items-start">
                            <span className="text-[#D87B53] flex-shrink-0 leading-relaxed">•</span>
                            <span>{parseBold(line.replace(/^[-*•]\s/, ''))}</span>
                        </li>
                    ))}
                </ul>
            );
        }

        if (isNumbered) {
            return (
                <ol key={pIdx} className="space-y-1.5 pl-1">
                    {lines.map((line, i) => (
                        <li key={i} className="flex gap-2 items-start">
                            <span className="text-[#D87B53] flex-shrink-0 font-semibold min-w-[1.25rem] leading-relaxed">
                                {i + 1}.
                            </span>
                            <span>{parseBold(line.replace(/^\d+\.\s/, ''))}</span>
                        </li>
                    ))}
                </ol>
            );
        }

        return <p key={pIdx}>{parseBold(lines.join(' '))}</p>;
    };

    return (
        <div className="space-y-2.5 text-sm leading-relaxed">
            {content.split(/\n\n+/).map((para, i) => renderParagraph(para.trim(), i))}
        </div>
    );
};

/** Single chat bubble, user (right) or model (left). */
const ChatBubble = ({ message }) => {
    const isUser = message.role === 'user';
    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div
                className={`
                    max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed
                    ${isUser
                    ? 'bg-[#D87B53] text-white rounded-br-sm'
                    : 'bg-[#2c3440] text-[#EBDFD9] rounded-bl-sm'}
                `}
            >
                {isUser
                    ? message.content
                    : <FormattedText content={message.content} />}
            </div>
        </div>
    );
};

/** Animated typing indicator while waiting for a reply. */
const TypingIndicator = () => (
    <div className="flex justify-start">
        <div className="bg-[#2c3440] rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
            {[0, 150, 300].map((delay) => (
                <span
                    key={delay}
                    className="w-1.5 h-1.5 rounded-full bg-[#89BAA2] animate-bounce"
                    style={{ animationDelay: `${delay}ms` }}
                />
            ))}
        </div>
    </div>
);

// ── Main component ─────────────────────────────────────────────────────────────

const Agent = () => {
    const { user }     = useAuth();
    const { watched }  = useTracking();

    const [open,      setOpen]      = useState(false);
    const [messages,  setMessages]  = useState([INITIAL_MESSAGE]);
    const [input,     setInput]     = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const bottomRef  = useRef(null);
    const inputRef   = useRef(null);

    // Auto-scroll to latest message
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    // Focus input when chat opens
    useEffect(() => {
        if (open) setTimeout(() => inputRef.current?.focus(), 100);
    }, [open]);

    // ── Send message ───────────────────────────────────────────────────────────

    const [cooldown, setCooldown] = useState(false);

    const sendMessage = useCallback(async () => {
        const text = input.trim();
        if (!text || isLoading || !user) return;

        const userMessage = { role: 'user', content: text };

        // Append user message and clear input immediately for responsive feel
        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();

            const res = await fetch(`${FUNCTIONS_URL}/chat`, {
                method:  'POST',
                headers: {
                    'Content-Type':  'application/json',
                    'Authorization': `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify({
                    messages:     [...messages, userMessage],
                    watchedShows: watched.map((s) => s.show_name),
                }),
            });

            const data = await res.json();

            if (res.status === 429) {
                setMessages((prev) => [...prev, { role: 'model', content: data.message }]);
                return; // rate limit message is user-friendly enough instead of throwing error
            }

            if (!res.ok || data.error) throw new Error(data.error ?? 'Request failed');

            setMessages((prev) => [...prev, { role: 'model', content: data.reply }]);
        } catch (err) {
            console.error('Agent error:', err);
            setMessages((prev) => [
                ...prev,
                { role: 'model', content: "Sorry, I couldn't get a response. Please try again." },
            ]);
        } finally {
            setIsLoading(false);
            // 3s frontend cooldown — reduces unnecessary edge function calls
            setCooldown(true);
            setTimeout(() => setCooldown(false), 3000);
        }
    }, [input, isLoading, user, messages, watched]);

    // Enter sends, Shift+Enter newline
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const handleReset = () => setMessages([INITIAL_MESSAGE]);

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <>
            {/* ── Floating toggle button ───────────────────────────────────── */}
            <button
                onClick={() => setOpen((prev) => !prev)}
                aria-label={open ? 'Close AI assistant' : 'Open AI assistant'}
                className="fixed bottom-5 right-5 z-50 w-13 h-13 rounded-full shadow-xl
                           flex items-center justify-center transition-all duration-200
                           hover:scale-105 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #D87B53 0%, #EF8D72 100%)',
                    width: '52px', height: '52px' }}
            >
                {open
                    ? <CloseIcon sx={{ color: 'white', fontSize: 22 }} />
                    : <ChatBubbleOutlineOutlinedIcon sx={{ color: 'white', fontSize: 22 }} />}
            </button>

            {/* ── Chat panel ───────────────────────────────────────────────── */}
            {open && (
                <div
                    className="fixed z-50 flex flex-col
                               bottom-0 right-0 w-full h-[100dvh]
                               sm:bottom-20 sm:right-5 sm:w-[360px] sm:h-[520px]
                               sm:rounded-2xl overflow-hidden
                               bg-[#1a1f28] border border-[#2c3440] shadow-2xl"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3.5
                                    border-b border-[#2c3440] flex-shrink-0"
                         style={{ background: 'linear-gradient(135deg, #D87B53 0%, #EF8D72 100%)' }}
                    >
                        <div className="flex items-center gap-2.5">
                            <ChatBubbleOutlineOutlinedIcon sx={{ color: 'white', fontSize: 18 }} />
                            <div>
                                <p className="text-white font-bold text-sm leading-none">Recommender</p>
                                <p className="text-white/70 text-xs mt-0.5">TV show recommendations</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            {/* New chat */}
                            <button
                                onClick={handleReset}
                                title="New conversation"
                                className="text-white/70 hover:text-white transition-colors
                                           text-xs px-2 py-1 rounded hover:bg-white/10"
                            >
                                New chat
                            </button>
                            {/* Close (mobile) */}
                            <button
                                onClick={() => setOpen(false)}
                                aria-label="Close"
                                className="sm:hidden text-white/70 hover:text-white
                                           transition-colors p-1 rounded hover:bg-white/10"
                            >
                                <CloseIcon sx={{ fontSize: 18 }} />
                            </button>
                        </div>
                    </div>

                    {/* ── Logged-out gate ───────────────────────────────────── */}
                    {!user ? (
                        <div className="flex-1 flex flex-col items-center justify-center
                                        gap-3 px-6 text-center">
                            <ChatBubbleOutlineOutlinedIcon sx={{ fontSize: 40, color: '#2c3440' }} />
                            <p className="text-[#EBDFD9] font-semibold text-sm">
                                Sign in to use Pilotd Recommender
                            </p>
                            <p className="text-[#89BAA2] text-xs">
                                Get personalised TV show recommendations based on what you've watched.
                            </p>
                            <Link
                                to="/login"
                                onClick={() => setOpen(false)}
                                className="mt-1 px-5 py-2 rounded-lg text-sm font-semibold
                                           text-[#14181c] transition-all hover:-translate-y-0.5"
                                style={{ background: 'linear-gradient(135deg, #D87B53 0%, #EF8D72 100%)' }}
                            >
                                Sign in
                            </Link>
                        </div>
                    ) : (
                        <>
                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3
                                            scrollbar-thin scrollbar-thumb-[#2c3440]">
                                {messages.map((msg, idx) => (
                                    <ChatBubble key={idx} message={msg} />
                                ))}
                                {isLoading && <TypingIndicator />}
                                <div ref={bottomRef} />
                            </div>

                            {/* Input */}
                            <div className="flex items-end gap-2 px-3 py-3
                                            border-t border-[#2c3440] flex-shrink-0">
                                <textarea
                                    ref={inputRef}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Give me a vibe you're looking for…"
                                    maxLength={1000}
                                    rows={1}
                                    disabled={isLoading}
                                    className="flex-1 bg-[#2c3440] text-[#EBDFD9] text-sm
                                               rounded-xl px-3.5 py-2.5 resize-none
                                               border border-[#DCB35A]/10
                                               focus:outline-none focus:border-[#D87B53]/40
                                               placeholder-[#89BAA2]/40 transition-colors
                                               disabled:opacity-50 max-h-28"
                                    style={{ lineHeight: '1.5' }}
                                    onInput={(e) => {
                                        // Auto-grow textarea up to max-h-28
                                        e.target.style.height = 'auto';
                                        e.target.style.height = `${e.target.scrollHeight}px`;
                                    }}
                                />
                                <button
                                    onClick={sendMessage}
                                    disabled={!input.trim() || isLoading || cooldown}
                                    aria-label="Send message"
                                    className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center
                                               justify-center transition-all active:scale-95
                                               disabled:opacity-40 disabled:pointer-events-none"
                                    style={{ background: 'linear-gradient(135deg, #D87B53 0%, #EF8D72 100%)' }}
                                >
                                    {isLoading
                                        ? <CircularProgress size={16} sx={{ color: 'white' }} />
                                        : <SendIcon sx={{ fontSize: 17, color: 'white' }} />}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </>
    );
};

export default Agent;