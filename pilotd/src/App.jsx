import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router';
import { AuthProvider }           from './AuthContext.jsx';
import { ShowTrackingProvider }   from './ShowTrackingContext.jsx';

// Pages
import HomePage from './components/HomePage.jsx';
import Detail   from './components/Detail.jsx';
import Login    from './components/Login.jsx';
import Signup   from './components/Signup.jsx';
import Profile  from './components/Profile.jsx';
import Shows    from './components/Shows.jsx';
import Members   from './components/Members.jsx';
import FollowList from './components/FollowList';
import ActivityPage from './components/ActivityPage';
import Settings     from './components/Settings.jsx';

/**
 * App.jsx
 * provides auth + tracking context, declares all routes.
 */
function App() {
    return (
        <AuthProvider>
            <ShowTrackingProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/"                element={<HomePage />} />
                        <Route path="/show/:id"        element={<Detail />} />
                        <Route path="/shows"           element={<Shows />} />
                        <Route path="/members"         element={<Members />} />
                        <Route path="/profile/:username/followers"  element={<FollowList mode="followers" />} />
                        <Route path="/profile/:username/following"  element={<FollowList mode="following" />} />
                        <Route path="/login"           element={<Login />} />
                        <Route path="/signup"          element={<Signup />} />
                        <Route path="/activity"        element={<ActivityPage />} />
                        <Route path="/settings"        element={<Settings />} />
                        <Route path="/profile"         element={<Profile />} />
                        <Route path="/profile/:userId" element={<Profile />} />
                    </Routes>
                </BrowserRouter>
            </ShowTrackingProvider>
        </AuthProvider>
    );
}

export default App;
