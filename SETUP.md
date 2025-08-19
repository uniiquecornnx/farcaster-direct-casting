# 🚀 Quick Setup Guide

## Prerequisites

1. **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
2. **Neynar API Key** - Get one from [neynar.com](https://neynar.com)
3. **Farcaster Account** - You'll need your FID (Farcaster ID)

## ⚡ Quick Start (5 minutes)

### 1. Clone and Install
```bash
git clone <your-repo-url>
cd farcaster-direct-casting
npm install
```

### 2. Get Your Neynar API Key
1. Go to [neynar.com](https://neynar.com)
2. Click "Subscribe now" and choose a plan
3. After payment, you'll get an email with your API key
4. Copy the API key

### 3. Configure Environment
```bash
cp env.example .env
```

Edit `.env` and add your API key:
```env
NEYNAR_API_KEY=your_actual_api_key_here
```

### 4. Test Connection
```bash
node test-neynar.js
```

You should see:
```
✅ NEYNAR_API_KEY found
✅ Neynar client initialized successfully
✅ User fetch successful!
✅ Feed fetch successful!
🎉 All tests completed successfully!
```

### 5. Start the App
```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser!

## 🔍 Find Your FID

Your FID is your unique Farcaster ID number. To find it:

1. **Warpcast App**: Open your profile, your FID is shown
2. **Web**: Go to [warpcast.com](https://warpcast.com) and check your profile
3. **API**: Use a FID lookup tool

## 📱 How to Use

1. **Enter your FID** in the input field
2. **Click "Connect to Farcaster"**
3. **Scan the QR code** with your Farcaster app
4. **Approve the connection** in your app
5. **Start casting!** Type your message and click "Post to Farcaster"

## 🆘 Troubleshooting

### "NEYNAR_API_KEY not found"
- Make sure you created a `.env` file
- Verify the key is correct (no extra spaces)

### "Failed to create signer"
- Check your API key is valid
- Ensure you have sufficient API credits
- Try the test script: `node test-neynar.js`

### "Rate limit exceeded"
- Wait a minute and try again
- Check your Neynar plan limits

### QR code not working
- Make sure you have the Farcaster app installed
- Try the direct link instead of scanning
- Ensure your phone can access the internet

## 🔧 Development

### File Structure
- `index.html` - Frontend UI
- `server.js` - Backend API server
- `database/db.js` - Local database functions
- `test-neynar.js` - Test Neynar integration

### Adding Features
- **Channels**: Modify `server.js` to support channel posting
- **Mentions**: Add mention parsing in the frontend
- **Embeds**: Extend the cast input to support URLs and media

### Database
Currently using file-based storage. To upgrade:
- **SQLite**: Replace file functions with SQLite queries
- **PostgreSQL**: Use a proper database for production

## 📊 API Endpoints

- `POST /api/create-signer` - Create signer for user
- `GET /api/signer-status/:uuid` - Check signer status
- `POST /api/post-cast` - Post new cast
- `GET /api/user/:fid` - Get user profile
- `GET /api/stats` - Database statistics

## 🚀 Deployment

### Local Development
```bash
npm start
```

### Production
1. Set `NODE_ENV=production` in your environment
2. Use a process manager like PM2
3. Set up a reverse proxy (nginx)
4. Configure SSL certificates

### Environment Variables
```env
NEYNAR_API_KEY=your_api_key
PORT=3000
NODE_ENV=production
```

## 📞 Support

- **Neynar**: [neynar.com](https://neynar.com) - API support
- **Farcaster**: [Discord](https://discord.gg/farcaster) - Community help
- **Issues**: Open an issue in this repository

---

**Happy Casting! 🐘✨** 