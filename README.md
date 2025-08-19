# Farcaster Direct Casting

A simple web application for one-tap casting to Farcaster using Neynar's managed signers.

## 🚀 Features

- 🔗 **Easy Connection** - Connect to Farcaster using your FID
- 📱 **QR Code Approval** - Scan QR code to approve in Farcaster app
- 📝 **One-Tap Casting** - Post to Farcaster with a single click
- 💾 **Local Database** - Store user sessions and post history
- 🎨 **Beautiful UI** - Modern, responsive design

## 🏗️ Architecture

- **Frontend**: Pure HTML/CSS/JavaScript with modern UI
- **Backend**: Node.js + Express server
- **Farcaster Integration**: Neynar SDK for managed signers
- **Database**: File-based storage (easily upgradeable to SQLite/PostgreSQL)

## 📋 Prerequisites

1. **Neynar API Key** - Get one from [neynar.com](https://neynar.com)
2. **Node.js** (v16 or higher)
3. **Farcaster Account** - You'll need your FID (Farcaster ID)

## 🛠️ Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy the example environment file and add your Neynar API key:

```bash
cp env.example .env
```

Edit `.env` and add your Neynar API key:
```env
NEYNAR_API_KEY=your_actual_api_key_here
```

### 3. Start the Server

```bash
npm start
```

The app will be available at `http://localhost:3000`

## 🔐 How It Works

### Authentication Flow

1. **Enter FID**: User enters their Farcaster ID
2. **Create Signer**: Backend creates a managed signer via Neynar
3. **QR Code**: User scans QR code with Farcaster app
4. **Approve**: User approves the signer in Farcaster app
5. **Connected**: App can now post on user's behalf

### Casting Flow

1. **Write Cast**: User types their message
2. **One Tap**: Click "Post to Farcaster"
3. **Published**: Cast is posted to Farcaster via Neynar

## 📁 Project Structure

```
farcaster-direct-casting/
├── index.html              # Main application page
├── server.js               # Express server with Neynar integration
├── package.json            # Dependencies and scripts
├── env.example             # Environment variables template
├── database/               # Local database storage
│   ├── users/             # User account information
│   ├── posts/             # Post history
│   ├── sessions/          # User sessions
│   └── README.md          # Database documentation
└── README.md              # This file
```

## 🔧 API Endpoints

- `POST /api/create-signer` - Create a new signer for a user
- `GET /api/signer-status/:signerUuid` - Check signer approval status
- `POST /api/post-cast` - Post a new cast to Farcaster
- `GET /api/qr-code/:signerUuid` - Generate QR code for approval
- `GET /api/user/:fid` - Fetch user profile information

## 🎯 Current Status

- ✅ **Complete**: Neynar integration with managed signers
- ✅ **Complete**: QR code authentication flow
- ✅ **Complete**: One-tap casting functionality
- ✅ **Complete**: User profile display
- ✅ **Complete**: Real-time status updates
- ⏳ **Pending**: Database persistence for posts and sessions
- ⏳ **Pending**: Error handling improvements
- ⏳ **Pending**: Rate limiting and security enhancements

## 🚀 Next Steps

1. **Database Integration**: Implement persistent storage for posts and sessions
2. **Error Handling**: Add comprehensive error handling and user feedback
3. **Security**: Add rate limiting and input validation
4. **Features**: Add support for channels, mentions, and embeds
5. **Deployment**: Deploy to production with proper environment setup

## 🆘 Troubleshooting

### Common Issues

1. **"NEYNAR_API_KEY not found"**
   - Make sure you've created a `.env` file with your API key
   - Verify the key is correct and active

2. **"Failed to create signer"**
   - Check your Neynar API key is valid
   - Ensure you have sufficient API credits

3. **QR code not working**
   - Make sure you have the Farcaster app installed
   - Try the direct link instead of scanning

### Getting Help

- **Neynar Support**: Check [neynar.com](https://neynar.com) for API documentation
- **Farcaster Help**: Join the [Farcaster Discord](https://discord.gg/farcaster)
- **Issues**: Open an issue in this repository

## 📱 User Experience

The app provides a seamless experience:

1. **Simple Setup**: Just enter your FID and scan a QR code
2. **Quick Approval**: Approve once, cast many times
3. **Instant Feedback**: Real-time status updates and confirmations
4. **Mobile Friendly**: Works great on both desktop and mobile

## 🔒 Security Notes

- **API Keys**: Never commit your `.env` file to version control
- **Signers**: Each user gets a unique signer that only they can approve
- **Permissions**: Signers only have write permissions, not read access
- **Session Management**: Signers are stored in memory (consider database storage for production)

## 📄 License

MIT License - feel free to use this for your own projects!

---

**Built with ❤️ for the Farcaster community** # farcaster-direct-casting
