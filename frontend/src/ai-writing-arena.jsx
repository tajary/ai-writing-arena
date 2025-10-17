import React, { useState, useEffect, useRef } from 'react';
import { Trophy, Clock, Target, TrendingUp, Award, Zap, BookOpen, Star, CheckCircle, Medal, Crown, Sparkles } from 'lucide-react';

const AIWritingArena = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [fullWalletAddress, setFullWalletAddress] = useState('');
  const [currentView, setCurrentView] = useState('home');
  const [timeLeft, setTimeLeft] = useState(300);
  const [isWriting, setIsWriting] = useState(false);
  const [text, setText] = useState('');
  const [currentTopic, setCurrentTopic] = useState(null);
  const [lastScore, setLastScore] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // API Base URL - update this to your server URL
  const API_BASE_URL = 'http://127.0.0.1:3001/api';

  useEffect(() => {
    if (isWriting && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && isWriting) {
      handleSubmit();
    }
  }, [isWriting, timeLeft]);

  // Load user stats when connected
  useEffect(() => {
    if (isConnected && fullWalletAddress) {
      fetchUserStats();
    }
  }, [isConnected, fullWalletAddress]);

  // Load leaderboard when viewing leaderboard
  useEffect(() => {
    if (currentView === 'leaderboard') {
      fetchLeaderboard();
    }
  }, [currentView]);

  const connectWallet = async () => {
    //alert("Yes")
    try {
      if (typeof window.ethereum === 'undefined') {
        alert('MetaMask is not installed! Please install MetaMask browser extension to continue.');
        return;
      }

      // First, try to get accounts without requesting (to check if already connected)
      const initialAccounts = await window.ethereum.request({
        method: 'eth_accounts'
      });

      let accounts;
      if (initialAccounts.length === 0) {
        // No accounts connected, request access
        accounts = await window.ethereum.request({
          method: 'eth_requestAccounts'
        });
      } else {
        // Already connected, use existing accounts
        accounts = initialAccounts;
      }

      // Check if we still have no accounts (MetaMask is locked)
      if (accounts.length === 0) {
        alert('MetaMask is locked! Please unlock your MetaMask extension and try again.');
        return;
      }
      const account = accounts[0];
      const message = `Welcome to AI Writing Arena!\n\nSign this message to verify your identity.\n\nWallet: ${account}\nTimestamp: ${Date.now()}`;

      try {
        const signature = await window.ethereum.request({
          method: 'personal_sign',
          params: [message, account],
        });

        // Authenticate with backend
        const authResponse = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            walletAddress: account,
            signature: signature,
            message: message
          })
        });

        if (!authResponse.ok) {
          throw new Error('Authentication failed');
        }

        const authData = await authResponse.json();

        // Store token for subsequent requests
        localStorage.setItem('authToken', authData.token);

        const formattedAddress = `${account.slice(0, 6)}...${account.slice(-4)}`;
        setWalletAddress(formattedAddress);
        setFullWalletAddress(account);
        setIsConnected(true);

      } catch (signError) {
        console.error('Signature rejected:', signError);
        alert('You must sign the message to verify your identity.');
      }

    } catch (error) {
      console.error('Error connecting to MetaMask:', error);
      if (error.code === 4001) {
        alert('Connection rejected. Please try again.');
      } else {
        alert('Failed to connect to MetaMask. Please try again.');
      }
    }
  };

  const fetchUserStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');

      const response = await fetch(`${API_BASE_URL}/user/stats`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user stats');
      }

      const data = await response.json();
      setUserStats(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching user stats:', error);
      setError('Failed to load user statistics');
      setLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');

      const response = await fetch(`${API_BASE_URL}/leaderboard?limit=10`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }

      const data = await response.json();
      setLeaderboard(data.leaderboard);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setError('Failed to load leaderboard');
      setLoading(false);
    }
  };

  const startWriting = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');

      const response = await fetch(`${API_BASE_URL}/topic/current`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch topic');
      }

      const data = await response.json();
      setCurrentTopic(data);
      setTimeLeft(300);
      setText('');
      setIsWriting(true);
      setCurrentView('write');
      setLastScore(null);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching topic:', error);
      setError('Failed to load writing topic');
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setIsWriting(false);
    setLoading(true);

    try {
      const token = localStorage.getItem('authToken');
      const wordCount = text.trim().split(/\s+/).length;

      const response = await fetch(`${API_BASE_URL}/submission/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topicId: currentTopic.id,
          text: text,
          timeSpent: 300 - timeLeft,
          wordCount: wordCount
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit writing');
      }

      const result = await response.json();
      setLastScore(result);
      setCurrentView('results');

      // Refresh user stats after submission
      await fetchUserStats();

      setLoading(false);
    } catch (error) {
      console.error('Error submitting writing:', error);
      setError('Failed to submit writing');
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = () => {
    if (timeLeft > 180) return 'text-emerald-500';
    if (timeLeft > 60) return 'text-amber-500';
    return 'text-rose-500';
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setIsConnected(false);
    setWalletAddress('');
    setFullWalletAddress('');
    setCurrentView('home');
    setIsWriting(false);
    setText('');
    setLastScore(null);
    setUserStats(null);
    setLeaderboard([]);
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 mb-6 shadow-2xl shadow-purple-500/50">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-6xl font-bold text-white mb-4 tracking-tight">
              AI Writing Arena
            </h1>
            <p className="text-xl text-purple-200 max-w-2xl mx-auto">
              Compete in real-time writing challenges. Sharpen your skills. Rise through the ranks.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-400/30">
                <Clock className="w-8 h-8 text-cyan-400 mx-auto mb-3" />
                <h3 className="text-white font-semibold mb-1">5-Min Challenges</h3>
                <p className="text-sm text-purple-200">New topic every round</p>
              </div>
              <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-400/30">
                <Zap className="w-8 h-8 text-pink-400 mx-auto mb-3" />
                <h3 className="text-white font-semibold mb-1">AI Judging</h3>
                <p className="text-sm text-purple-200">Instant detailed feedback</p>
              </div>
              <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-400/30">
                <Trophy className="w-8 h-8 text-amber-400 mx-auto mb-3" />
                <h3 className="text-white font-semibold mb-1">Live Rankings</h3>
                <p className="text-sm text-purple-200">Compete globally</p>
              </div>
            </div>

            <button
              onClick={connectWallet}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-2xl font-semibold text-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-purple-500/50 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Connecting...' : 'Connect MetaMask Wallet'}
            </button>
            <p className="text-center text-purple-300 text-sm mt-4">
              Sign in securely with your digital wallet to begin
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <nav className="bg-black/30 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-white">AI Writing Arena</span>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => setCurrentView('home')}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${currentView === 'home' ? 'bg-purple-600 text-white' : 'text-purple-200 hover:text-white'
                  }`}
              >
                Home
              </button>
              <button
                onClick={() => setCurrentView('leaderboard')}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${currentView === 'leaderboard' ? 'bg-purple-600 text-white' : 'text-purple-200 hover:text-white'
                  }`}
              >
                Leaderboard
              </button>
              <button
                onClick={() => setCurrentView('stats')}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${currentView === 'stats' ? 'bg-purple-600 text-white' : 'text-purple-200 hover:text-white'
                  }`}
              >
                My Stats
              </button>
              <div className="px-4 py-2 bg-white/10 rounded-xl border border-white/20">
                <span className="text-purple-200 text-sm">{walletAddress}</span>
              </div>
              <button
                onClick={logout}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-medium transition-all"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading && !isWriting && (
          <div className="text-center py-12">
            <div className="inline-block w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-purple-200">Loading...</p>
          </div>
        )}

        {error && (
          <div className="bg-rose-500/20 border border-rose-500/50 rounded-2xl p-4 mb-6 text-rose-200">
            {error}
          </div>
        )}

        {currentView === 'home' && !loading && (
          <div className="space-y-8">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-white mb-4">Ready to Write?</h2>
              <p className="text-xl text-purple-200">Start a new challenge and showcase your creativity</p>
            </div>

            {userStats && (
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
                  <div className="flex items-center justify-between mb-4">
                    <Target className="w-8 h-8 text-purple-400" />
                    <span className="text-3xl font-bold text-white">{userStats.totalWritings}</span>
                  </div>
                  <p className="text-purple-200">Total Writings</p>
                </div>
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
                  <div className="flex items-center justify-between mb-4">
                    <Star className="w-8 h-8 text-amber-400" />
                    <span className="text-3xl font-bold text-white">{userStats.avgScore}</span>
                  </div>
                  <p className="text-purple-200">Average Score</p>
                </div>
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
                  <div className="flex items-center justify-between mb-4">
                    <Trophy className="w-8 h-8 text-pink-400" />
                    <span className="text-3xl font-bold text-white">#{userStats.rank}</span>
                  </div>
                  <p className="text-purple-200">Global Rank</p>
                </div>
              </div>
            )}

            <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 backdrop-blur-xl rounded-3xl p-12 border border-purple-400/30 text-center">
              <BookOpen className="w-16 h-16 text-purple-300 mx-auto mb-6" />
              <h3 className="text-3xl font-bold text-white mb-4">New Challenge Awaits</h3>
              <p className="text-purple-200 mb-8 max-w-2xl mx-auto">
                You'll have 5 minutes to craft your response. Write from the heart, be creative, and let the AI judge your masterpiece.
              </p>
              <button
                onClick={startWriting}
                disabled={loading}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-12 py-4 rounded-2xl font-semibold text-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-purple-500/50 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start Writing Challenge
              </button>
            </div>
          </div>
        )}

        {currentView === 'write' && isWriting && currentTopic && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 mb-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className={`text-5xl font-bold ${getTimeColor()}`}>
                    {formatTime(timeLeft)}
                  </div>
                  <Clock className={`w-8 h-8 ${getTimeColor()}`} />
                </div>
                <div className="text-right">
                  <div className="text-sm text-purple-300">Word Count</div>
                  <div className="text-2xl font-bold text-white">
                    {text.trim() ? text.trim().split(/\s+/).length : 0}
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-600/30 to-pink-600/30 rounded-2xl p-6 mb-6 border border-purple-400/30">
                <div className="text-sm text-purple-300 mb-2">Your Topic:</div>
                <div className="text-xl font-semibold text-white">{currentTopic.topic}</div>
              </div>

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Begin writing your story..."
                className="w-full h-96 bg-white/5 border-2 border-purple-400/30 rounded-2xl p-6 text-white placeholder-purple-300/50 focus:outline-none focus:border-purple-400 resize-none text-lg leading-relaxed"
              />

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="mt-6 w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-4 rounded-2xl font-semibold text-lg hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting...' : 'Submit Writing'}
              </button>
            </div>
          </div>
        )}

        {currentView === 'results' && lastScore && (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 mb-4 shadow-2xl">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-4xl font-bold text-white mb-2">Writing Submitted!</h2>
              <p className="text-xl text-purple-200">Here's your detailed feedback</p>
            </div>

            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 mb-6">
              <div className="text-center mb-8">
                <div className="text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-2">
                  {lastScore.overall}
                </div>
                <div className="text-purple-200">Overall Score</div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-blue-500/20 rounded-2xl p-4 border border-blue-400/30">
                  <div className="text-2xl font-bold text-white mb-1">{lastScore.grammar}</div>
                  <div className="text-sm text-blue-300">Grammar</div>
                </div>
                <div className="bg-purple-500/20 rounded-2xl p-4 border border-purple-400/30">
                  <div className="text-2xl font-bold text-white mb-1">{lastScore.vocabulary}</div>
                  <div className="text-sm text-purple-300">Vocabulary</div>
                </div>
                <div className="bg-pink-500/20 rounded-2xl p-4 border border-pink-400/30">
                  <div className="text-2xl font-bold text-white mb-1">{lastScore.creativity}</div>
                  <div className="text-sm text-pink-300">Creativity</div>
                </div>
                <div className="bg-amber-500/20 rounded-2xl p-4 border border-amber-400/30">
                  <div className="text-2xl font-bold text-white mb-1">{lastScore.coherence}</div>
                  <div className="text-sm text-amber-300">Coherence</div>
                </div>
              </div>

              <div className="bg-white/5 rounded-2xl p-6 border border-white/10 ">
                <h3 className="text-lg font-semibold text-white mb-1 flex items-center">
                  <Zap className="w-5 h-5 mr-2 text-purple-400" />
                  Original Text
                </h3>
                <ul className="space-y-3 pb-10">
                  <li className="flex items-start text-purple-200 text-left">
                    <span className="text-purple-400 mr-2">•</span>
                    {lastScore.text}
                  </li>
                </ul>

                <h3 className="text-lg font-semibold text-white mb-1 flex items-center">
                  <Zap className="w-5 h-5 mr-2 text-purple-400" />
                  AI Feedback
                </h3>
                <ul className="space-y-3 pb-10">
                  <li className="flex items-start text-purple-200 text-left">
                    <span className="text-purple-400 mr-2">•</span>
                    {lastScore.feedback.feedback_short}
                  </li>
                </ul>

                <h3 className="text-lg font-semibold text-white mb-1 flex items-center">
                  <Zap className="w-5 h-5 mr-2 text-purple-400" />
                  Corrected Text
                </h3>
                <ul className="space-y-3 pb-10">
                  <li className="flex items-start text-purple-200  text-left">
                    <span className="text-purple-400 mr-2">•</span>
                    {lastScore.feedback.corrected_text}
                  </li>
                </ul>

                <h3 className="text-lg font-semibold text-white mb-1 flex items-center">
                  <Zap className="w-5 h-5 mr-2 text-purple-400" />
                  Edits
                </h3>
                <div>
                  <ul className="space-y-3 pb-10">
                    {lastScore.feedback.edits.map((item, idx) => {
                      return (
                        <li key={idx} className="space-y-2 p-3">
                          <div className="flex items-start text-purple-200">
                            Original: {item.original}
                          </div>
                          <div className="flex items-start text-purple-200">
                            Corrected: {item.corrected}
                          </div>
                          <div className="flex items-start text-purple-200">
                            Reason: {item.reason}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <h3 className="text-lg font-semibold text-white mb-1 flex items-center">
                  <Zap className="w-5 h-5 mr-2 text-purple-400" />
                  Suggested Rewrite
                </h3>
                <ul className="space-y-3 pb-10">
                  <li className="flex items-start text-purple-200 text-left">
                    <span className="text-purple-400 mr-2">•</span>
                    {lastScore.feedback.suggested_rewrite}
                  </li>
                </ul>
                <h3 className="text-lg font-semibold text-white mb-1 flex items-center">
                  <Zap className="w-5 h-5 mr-2 text-purple-400" />
                  Tips
                </h3>
                <ul className="space-y-3 pb-10">
                  {lastScore.feedback.tips.map((item, idx) => (
                    <li key={idx} className="flex items-start text-purple-200">
                      <span className="text-purple-400 mr-2">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <button
              onClick={startWriting}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-2xl font-semibold text-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start New Challenge
            </button>
          </div>
        )}

        {currentView === 'leaderboard' && !loading && (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-white mb-2">Global Leaderboard</h2>
              <p className="text-xl text-purple-200">Top writers in the arena</p>
            </div>

            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20">
              {leaderboard.length > 0 ? (
                <div className="space-y-4">
                  {leaderboard.map((user, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-4 rounded-2xl ${idx === 0
                        ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border-2 border-amber-400/50'
                        : 'bg-white/5 border border-white/10'
                        }`}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center justify-center w-12 h-12">
                          {idx === 0 && <Crown className="w-8 h-8 text-amber-400" />}
                          {idx === 1 && <Medal className="w-8 h-8 text-slate-400" />}
                          {idx === 2 && <Medal className="w-8 h-8 text-orange-600" />}
                          {idx > 2 && <span className="text-2xl font-bold text-purple-300">#{user.rank}</span>}
                        </div>
                        <div>
                          <div className="font-semibold text-white">{user.walletAddress}</div>
                          <div className="text-sm text-purple-300">{user.totalWritings} writings</div>
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-white">{user.avgScore}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-purple-200">No leaderboard data available</p>
              )}
            </div>
          </div>
        )}

        {currentView === 'stats' && !loading && userStats && (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-white mb-2">Your Statistics</h2>
              <p className="text-xl text-purple-200">Track your writing journey</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-purple-400" />
                  Performance Overview
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-purple-200">Total Writings</span>
                    <span className="text-2xl font-bold text-white">{userStats.totalWritings}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-purple-200">Average Score</span>
                    <span className="text-2xl font-bold text-white">{userStats.avgScore}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-purple-200">Best Score</span>
                    <span className="text-2xl font-bold text-white">{userStats.bestScore}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-purple-200">Global Rank</span>
                    <span className="text-2xl font-bold text-white">#{userStats.rank}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Award className="w-5 h-5 mr-2 text-purple-400" />
                  Achievements
                </h3>
                <div className="space-y-3">
                  {userStats.achievements && userStats.achievements.length > 0 ? (
                    userStats.achievements.map((achievement, idx) => (
                      <div key={idx} className="flex items-center space-x-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 p-3 rounded-xl border border-purple-400/30">
                        <Star className="w-6 h-6 text-amber-400" />
                        <span className="text-white font-medium">{achievement}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-purple-200">No achievements yet. Keep writing!</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIWritingArena;