import React from 'react'
//import ChatBot from "react-chatbotify"
import {useEffect} from "react"
import '@n8n/chat/style.css'
import {createChat} from "@n8n/chat"

const N8N_HOOK = import.meta.env.N8N_CHAT_HOOK;

const Agent = () => {
    useEffect(() => {
        createChat({
            webhookUrl: N8N_HOOK,
            initialMessages: [
                'Hey! What are we in the mood for today?'
            ],
            i18n: {
                en: {
                    title: 'Pilotd',
                    subtitle: "Let's find something to watch",
                    footer: '',
                    getStarted: 'New Conversation',
                    inputPlaceholder: "Give me a vibe you're looking for",
                },
            },
            enableStreaming: true,
        });
    }, []);

    return (<div id="n8n-chat-widget"></div>)
}

export default Agent;