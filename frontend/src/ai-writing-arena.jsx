import React, { useState, useEffect, useRef } from 'react';
import { ethers } from "ethers";
import { Trophy, Clock, Target, TrendingUp, Award, Zap, BookOpen, Star, CheckCircle, Medal, Crown, Sparkles, List, Users, FileText } from 'lucide-react';

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


  const [mySubmissions, setMySubmissions] = useState([]);
  const [topSubmissions, setTopSubmissions] = useState([]);
  const [usedTopics, setUsedTopics] = useState([]);
  const [selectedTopicId, setSelectedTopicId] = useState('');

  // API Base URL - update this to your server URL
  const API_BASE_URL = 'https://awa-srv.buildlabz.xyz/api';

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
    } else if (currentView === 'mySubmissions') {
      fetchMySubmissions();
    } else if (currentView === 'usedTopics') {
      fetchUsedTopics();
    }
  }, [currentView]);

  const connectWallet = async () => {
    //alert("Yes")
    const OG_CHAIN_ID = 16661n;
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

      try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: "0x4115" }],
        });
    } catch (switchError) {
        // This error code indicates that the chain has not been added to MetaMask
        if (switchError.code === 4902) {
            console.log('This network is not added in MetaMask. Please add it first.');
        }
        console.error('Failed to switch network:', switchError);
    }


      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      console.log("Current network:", network, network.chainId);

      if (network.chainId !== OG_CHAIN_ID) {
        alert("Please switch your wallet to 0G Network!");
        return;
      }

      const account = accounts[0];
      const message = `Welcome to AI Writing Arena!\n\nSign this message to verify your identity.\n\nWallet: ${account}\nTimestamp: ${Date.now()}`;

      try {
        const signature = await window.ethereum.request({
          method: 'personal_sign',
          params: [message, account],
        });

        //Authenticate with backend
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

  // NEW: Fetch user's submissions
  const fetchMySubmissions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');

      const response = await fetch(`${API_BASE_URL}/submission/my-submissions`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch submissions');
      }

      const data = await response.json();
      setMySubmissions(data.submissions || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      setError('Failed to load your submissions');
      setLoading(false);
    }
  };

  // NEW: Fetch top submissions for a specific topic
  const fetchTopSubmissions = async (topicId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');

      const response = await fetch(`${API_BASE_URL}/submission/top-submissions/${topicId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch top submissions');
      }

      const data = await response.json();
      setTopSubmissions(data.top_submissions || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching top submissions:', error);
      setError('Failed to load top submissions');
      setLoading(false);
    }
  };

  // NEW: Fetch used topics
  const fetchUsedTopics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');

      const response = await fetch(`${API_BASE_URL}/topic/used-topics`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch used topics');
      }

      const data = await response.json();
      setUsedTopics(data.topics || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching used topics:', error);
      setError('Failed to load used topics');
      setLoading(false);
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
    setMySubmissions([]);
    setTopSubmissions([]);
    setUsedTopics([]);
  };


  // NEW: Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
                onClick={() => setCurrentView('mySubmissions')}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${currentView === 'mySubmissions' ? 'bg-purple-600 text-white' : 'text-purple-200 hover:text-white'
                  }`}
              >
                My Writings
              </button>
              <button
                onClick={() => setCurrentView('stats')}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${currentView === 'stats' ? 'bg-purple-600 text-white' : 'text-purple-200 hover:text-white'
                  }`}
              >
                My Stats
              </button>
              <button
                onClick={() => setCurrentView('leaderboard')}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${currentView === 'leaderboard' ? 'bg-purple-600 text-white' : 'text-purple-200 hover:text-white'
                  }`}
              >
                Leaderboard
              </button>
              <button
                onClick={() => setCurrentView('usedTopics')}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${currentView === 'usedTopics' ? 'bg-purple-600 text-white' : 'text-purple-200 hover:text-white'
                  }`}
              >
                Topics
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
            <div className="relative inline-flex items-center justify-center mb-6">
              <div className="w-16 h-16 border-4 border-purple-500/30 rounded-full"></div>
              <div className="absolute w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              <div className="w-20 h-20 items-center justify-center flex absolute text-2xl bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl animate-pulse"><Sparkles className="w-10 h-10 text-white" /></div>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">AI is judging your writing</h3>
            <p className="text-purple-200 text-lg">Analyzing creativity, grammar, and style...</p>
            <div className="mt-4 text-sm text-purple-300">
              <span className="inline-block animate-pulse">⚡</span>
              <span className="inline-block animate-pulse mx-2" style={{ animationDelay: '200ms' }}>✨</span>
              <span className="inline-block animate-pulse" style={{ animationDelay: '400ms' }}>🌟</span>
            </div>
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
                <div className='text-left'>
                  <ul className="space-y-3 pb-10">
                    {lastScore.feedback.edits.map((item, idx) => {
                      return (
                        <li key={idx} className="space-y-2 p-3">
                          <div className="flex items-start text-purple-200 text-left">
                            <b>Original</b>: {item.original}
                          </div>
                          <div className="flex items-start text-purple-200 text-left">
                            <b>Corrected</b>: {item.corrected}
                          </div>
                          <div className="flex items-start text-purple-200 text-left">
                            <b>Reason</b>: {item.reason}
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
                  {leaderboard.map((user, idx) => {
                    const currentUserTruncated = `${fullWalletAddress.slice(0, 6)}...${fullWalletAddress.slice(-4)}`;
                    const isCurrentUser = user.walletAddress === currentUserTruncated;

                    return (
                      <div
                        key={idx}
                        className={`flex items-center justify-between p-4 rounded-2xl ${isCurrentUser
                          ? 'bg-gradient-to-r from-purple-500/40 to-pink-500/40 border-2 border-purple-400/70'
                          : idx === 0
                            ? 'bg-white/5 border border-white/10'
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
                            <div className="font-semibold text-white">
                              {user.walletAddress}
                              {isCurrentUser && (
                                <span className="ml-2 text-xs bg-purple-500 text-white px-2 py-1 rounded-full">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-purple-300">{user.totalWritings} writings</div>
                          </div>
                        </div>
                        <div className="text-3xl font-bold text-white">{user.avgScore}</div>
                      </div>
                    );
                  })}
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


        {/* NEW: My Submissions View */}
        {currentView === 'mySubmissions' && !loading && (
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-white mb-2">My Writings</h2>
              <p className="text-xl text-purple-200">Your writing journey with AI feedback</p>
            </div>

            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20">
              {mySubmissions.length > 0 ? (
                <div className="space-y-8">
                  {mySubmissions.map((submission, idx) => (
                    <div key={idx} className="bg-white/5 rounded-2xl p-6 border border-white/10">
                      {/* Header with Topic and Scores */}
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-white mb-2">{submission.topic}</h3>
                          <div className="flex items-center space-x-4 text-sm text-purple-300">
                            <span className={`px-2 py-1 rounded-full ${submission.difficulty === 'easy' ? 'bg-emerald-500/20 text-emerald-300' :
                              submission.difficulty === 'medium' ? 'bg-amber-500/20 text-amber-300' :
                                'bg-rose-500/20 text-rose-300'
                              }`}>
                              {submission.difficulty}
                            </span>
                            <span>{formatDate(submission.submitted_at)}</span>
                            <span>•</span>
                            <span>{submission.word_count} words</span>
                            <span>•</span>
                            <span>{submission.time_spent}s</span>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                            {submission.overall_score}
                          </div>
                          <div className="text-sm text-purple-300">Overall Score</div>
                        </div>
                      </div>

                      {/* Score Breakdown */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="text-center bg-blue-500/20 rounded-xl p-3 border border-blue-400/30">
                          <div className="text-xl font-bold text-white">{submission.grammar_score}</div>
                          <div className="text-xs text-blue-300">Grammar</div>
                        </div>
                        <div className="text-center bg-purple-500/20 rounded-xl p-3 border border-purple-400/30">
                          <div className="text-xl font-bold text-white">{submission.vocabulary_score}</div>
                          <div className="text-xs text-purple-300">Vocabulary</div>
                        </div>
                        <div className="text-center bg-pink-500/20 rounded-xl p-3 border border-pink-400/30">
                          <div className="text-xl font-bold text-white">{submission.creativity_score}</div>
                          <div className="text-xs text-pink-300">Creativity</div>
                        </div>
                        <div className="text-center bg-amber-500/20 rounded-xl p-3 border border-amber-400/30">
                          <div className="text-xl font-bold text-white">{submission.coherence_score}</div>
                          <div className="text-xs text-amber-300">Coherence</div>
                        </div>
                      </div>



                      <h3 className="text-lg font-semibold text-white mb-1 flex items-center">
                        <BookOpen className="w-5 h-5 mr-2 text-purple-400" />
                        Original Text
                      </h3>
                      <ul className="space-y-3 pb-10">
                        <li className="flex items-start text-purple-200 text-left">
                          <span className="text-purple-400 mr-2">•</span>
                          {submission.text}
                        </li>
                      </ul>

                      <h3 className="text-lg font-semibold text-white mb-1 flex items-center">
                        <Zap className="w-5 h-5 mr-2 text-purple-400" />
                        AI Feedback
                      </h3>
                      <ul className="space-y-3 pb-10">
                        <li className="flex items-start text-purple-200 text-left">
                          <span className="text-purple-400 mr-2">•</span>
                          {submission.feedback.feedback_short}
                        </li>
                      </ul>

                      <h3 className="text-lg font-semibold text-white mb-1 flex items-center">
                        <CheckCircle className="w-5 h-5 mr-2 text-purple-400" />
                        Corrected Text
                      </h3>
                      <ul className="space-y-3 pb-10">
                        <li className="flex items-start text-purple-200  text-left">
                          <span className="text-purple-400 mr-2">•</span>
                          {submission.feedback.corrected_text}
                        </li>
                      </ul>
                      <h3 className="text-lg font-semibold text-white mb-1 flex items-center">
                        <Zap className="w-5 h-5 mr-2 text-purple-400" />
                        Suggested Rewrite
                      </h3>
                      <ul className="space-y-3 pb-10">
                        <li className="flex items-start text-purple-200 text-left">
                          <span className="text-purple-400 mr-2">•</span>
                          {submission.feedback.suggested_rewrite}
                        </li>
                      </ul>

                      <h3 className="text-lg font-semibold text-white mb-1 flex items-center">
                        <Sparkles className="w-5 h-5 mr-2 text-purple-400" />
                        Corrections
                      </h3>
                      <div className='text-left'>
                        <ul className="space-y-3 pb-10">
                          {submission.feedback.edits.map((item, idx) => {
                            return (
                              <li key={idx} className="space-y-2 p-3">
                                <div className="flex items-start text-purple-200 text-left">
                                  <b>Original</b>: {item.original}
                                </div>
                                <div className="flex items-start text-purple-200 text-left">
                                  <b>Corrected</b>: {item.corrected}
                                </div>
                                <div className="flex items-start text-purple-200 text-left">
                                  <b>Reason</b>: {item.reason}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>

                      <h3 className="text-lg font-semibold text-white mb-1 flex items-center">
                        <TrendingUp className="w-5 h-5 mr-2 text-purple-400" />
                        Tips for Improvement
                      </h3>
                      <ul className="space-y-3 pb-10">
                        {submission.feedback.tips.map((item, idx) => (
                          <li key={idx} className="flex items-start text-purple-200">
                            <span className="text-purple-400 mr-2">•</span>
                            {item}
                          </li>
                        ))}
                      </ul>




                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-6 border-t border-white/10">
                        <button
                          onClick={() => {
                            setSelectedTopicId(submission.topic_id);
                            fetchTopSubmissions(submission.topic_id);
                            setCurrentView('topSubmissions');
                          }}
                          className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl font-medium hover:from-purple-700 hover:to-pink-700 transition-all text-center"
                        >
                          Compare with Top Submissions
                        </button>
                        <button
                          onClick={startWriting}
                          className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-700 hover:to-cyan-700 transition-all text-center"
                        >
                          Start New Challenge
                        </button>
                      </div>
                    </div>

                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-white mb-2">No Writings Yet</h3>
                  <p className="text-purple-200 mb-6">Start your first writing challenge to see your submissions here.</p>
                  <button
                    onClick={startWriting}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-2xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all"
                  >
                    Start Writing Challenge
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* NEW: Top Submissions View */}
        {currentView === 'topSubmissions' && !loading && (
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8">
              <button
                onClick={() => setCurrentView('usedTopics')}
                className="mb-4 text-purple-400 hover:text-purple-300 transition-colors flex items-center justify-center"
              >
                ← Back to Topics
              </button>
              <h2 className="text-4xl font-bold text-white mb-2">Top Submissions</h2>
              <p className="text-xl text-purple-200">Best writings for this topic</p>

              {/* Display the current topic */}
              {topSubmissions.length > 0 && (
                <div className="mt-4 bg-gradient-to-r from-purple-600/30 to-pink-600/30 rounded-2xl p-6 border border-purple-400/30 max-w-2xl mx-auto">
                  <div className="text-sm text-purple-300 mb-2">Topic:</div>
                  <div className="text-xl font-semibold text-white">{topSubmissions[0].topic || 'Current Topic'}</div>
                </div>
              )}
            </div>

            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20">
              {topSubmissions.length > 0 ? (
                <div className="space-y-8">
                  {topSubmissions.map((submission, idx) => (
                    <div
                      key={idx}
                      className={`bg-white/5 rounded-2xl p-6 border ${idx === 0
                        ? 'border-amber-400/50 bg-gradient-to-r from-amber-500/10 to-yellow-500/10'
                        : idx === 1
                          ? 'border-slate-400/50 bg-gradient-to-r from-slate-500/10 to-gray-500/10'
                          : 'border-orange-400/50 bg-gradient-to-r from-orange-500/10 to-red-500/10'
                        }`}
                    >
                      {/* Header with Rank and Wallet */}
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-4">
                          {idx === 0 && <Crown className="w-10 h-10 text-amber-400" />}
                          {idx === 1 && <Medal className="w-10 h-10 text-slate-300" />}
                          {idx === 2 && <Medal className="w-10 h-10 text-orange-400" />}
                          <div>
                            <div className="text-2xl font-bold text-white text-left">Rank #{idx + 1}</div>
                            <div className="text-sm text-purple-300">{`${submission.wallet_address.slice(0, 6)}...${submission.wallet_address.slice(-4)}`}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                            {submission.overall_score}
                          </div>
                          <div className="text-sm text-purple-300">Overall Score</div>
                        </div>
                      </div>

                      {/* Score Breakdown */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="text-center bg-blue-500/20 rounded-xl p-3 border border-blue-400/30">
                          <div className="text-xl font-bold text-white">{submission.grammar_score}</div>
                          <div className="text-xs text-blue-300">Grammar</div>
                        </div>
                        <div className="text-center bg-purple-500/20 rounded-xl p-3 border border-purple-400/30">
                          <div className="text-xl font-bold text-white">{submission.vocabulary_score}</div>
                          <div className="text-xs text-purple-300">Vocabulary</div>
                        </div>
                        <div className="text-center bg-pink-500/20 rounded-xl p-3 border border-pink-400/30">
                          <div className="text-xl font-bold text-white">{submission.creativity_score}</div>
                          <div className="text-xs text-pink-300">Creativity</div>
                        </div>
                        <div className="text-center bg-amber-500/20 rounded-xl p-3 border border-amber-400/30">
                          <div className="text-xl font-bold text-white">{submission.coherence_score}</div>
                          <div className="text-xs text-amber-300">Coherence</div>
                        </div>
                      </div>

                      {/* Original Writing */}
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                          <BookOpen className="w-5 h-5 mr-2 text-purple-400" />
                          Original Writing
                        </h3>
                        <div className="bg-black/30 rounded-xl p-4 border border-white/10">
                          <p className="text-purple-200 leading-relaxed whitespace-pre-wrap text-left">{submission.text}</p>
                        </div>
                      </div>

                      {/* AI Feedback Section */}
                      {submission.feedback && (
                        <div className="space-y-6">
                          {/* Short Feedback */}
                          {submission.feedback.feedback_short && (
                            <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-4 border border-purple-400/30">
                              <h4 className="text-lg font-semibold text-white mb-2 flex items-center">
                                <Zap className="w-5 h-5 mr-2 text-purple-400" />
                                AI Feedback
                              </h4>
                              <p className="text-purple-200 text-left">{submission.feedback.feedback_short}</p>
                            </div>
                          )}

                          {/* Corrected Text */}
                          {submission.feedback.corrected_text && (
                            <div>
                              <h4 className="text-lg font-semibold text-white mb-3 flex items-center">
                                <CheckCircle className="w-5 h-5 mr-2 text-emerald-400" />
                                Corrected Version
                              </h4>
                              <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-400/30">
                                <p className="text-emerald-200 leading-relaxed whitespace-pre-wrap text-left">{submission.feedback.corrected_text}</p>
                              </div>
                            </div>
                          )}

                          {/* Suggested Rewrite */}
                          {submission.feedback.suggested_rewrite && (
                            <div>
                              <h4 className="text-lg font-semibold text-white mb-3 flex items-center">
                                <Sparkles className="w-5 h-5 mr-2 text-amber-400" />
                                Enhanced Version
                              </h4>
                              <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-400/30">
                                <p className="text-amber-200 leading-relaxed whitespace-pre-wrap text-left">{submission.feedback.suggested_rewrite}</p>
                              </div>
                            </div>
                          )}

                          {/* Edits */}
                          {submission.feedback.edits && submission.feedback.edits.length > 0 && (
                            <div>
                              <h4 className="text-lg font-semibold text-white mb-3 flex items-center">
                                <Target className="w-5 h-5 mr-2 text-blue-400" />
                                Grammar Edits
                              </h4>
                              <div className="space-y-3">
                                {submission.feedback.edits.map((edit, editIdx) => (
                                  <div key={editIdx} className="bg-blue-500/10 rounded-xl p-4 border border-blue-400/30">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                                      <div>
                                        <div className="text-sm text-blue-300 mb-1">Original:</div>
                                        <div className="text-blue-200 bg-black/20 rounded p-2">{edit.original}</div>
                                      </div>
                                      <div>
                                        <div className="text-sm text-emerald-300 mb-1">Corrected:</div>
                                        <div className="text-emerald-200 bg-black/20 rounded p-2">{edit.corrected}</div>
                                      </div>
                                    </div>
                                    <div className="text-sm text-purple-300 mt-2">
                                      <span className="font-semibold">Reason:</span> {edit.reason}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Tips */}
                          {submission.feedback.tips && submission.feedback.tips.length > 0 && (
                            <div>
                              <h4 className="text-lg font-semibold text-white mb-3 flex items-center">
                                <TrendingUp className="w-5 h-5 mr-2 text-green-400" />
                                Improvement Tips
                              </h4>
                              <div className="bg-green-500/10 rounded-xl p-4 border border-green-400/30">
                                <ul className="space-y-2">
                                  {submission.feedback.tips.map((tip, tipIdx) => (
                                    <li key={tipIdx} className="flex items-start text-green-200">
                                      <span className="text-green-400 mr-2">•</span>
                                      {tip}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Submission Info */}
                      <div className="mt-6 pt-4 border-t border-white/10">
                        <div className="flex justify-between items-center text-sm text-purple-300">
                          <span>Words: {submission.word_count}</span>
                          <span>Time: {submission.time_spent}s</span>
                          <span>Submitted: {formatDate(submission.submitted_at)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Trophy className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-white mb-2">No Submissions Yet</h3>
                  <p className="text-purple-200">Be the first to submit for this topic!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* NEW: Used Topics View */}
        {currentView === 'usedTopics' && !loading && (
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-white mb-2">All Topics</h2>
              <p className="text-xl text-purple-200">Topics with submissions</p>
            </div>

            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20">
              {usedTopics.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-6">
                  {usedTopics.map((topic, idx) => (
                    <div key={idx} className="bg-white/5 rounded-2xl p-6 border border-white/10 flex flex-col">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-semibold text-white mb-2 text-left">{topic.topic}</h3>
                          <div className="flex items-center space-x-4 text-sm text-purple-300">
                            <span className={`px-2 py-1 rounded-full ${topic.difficulty === 'easy' ? 'bg-emerald-500/20 text-emerald-300' :
                              topic.difficulty === 'medium' ? 'bg-amber-500/20 text-amber-300' :
                                'bg-rose-500/20 text-rose-300'
                              }`}>
                              {topic.difficulty}
                            </span>
                            <span>{topic.submission_count} submissions</span>
                          </div>
                        </div>
                        {topic.highest_score && (
                          <div className="text-right">
                            <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                              {topic.highest_score}
                            </div>
                            <div className="text-sm text-purple-300">Best Score</div>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                        <div className="text-center">
                          <div className="text-lg font-bold text-white">{Math.round(topic.average_score)}</div>
                          <div className="text-purple-300">Avg Score</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-white">{topic.submission_count}</div>
                          <div className="text-purple-300">Submissions</div>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedTopicId(topic.id);
                          fetchTopSubmissions(topic.id);
                          setCurrentView('topSubmissions');
                        }}
                        className="w-1/2 mx-auto bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2 rounded-xl font-medium hover:from-purple-700 hover:to-pink-700 transition-all mt-auto"
                      >
                        View Top Submissions
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <List className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-white mb-2">No Topics Yet</h3>
                  <p className="text-purple-200">Topics will appear here once submissions are made.</p>
                </div>
              )}
            </div>
          </div>
        )}


      </div>
    </div>
  );
};

export default AIWritingArena;