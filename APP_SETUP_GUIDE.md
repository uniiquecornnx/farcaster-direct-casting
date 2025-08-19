# 🚀 Farcaster App Setup Guide

## 🎯 **What You Need to Get Started:**

To use the official Farcaster signer request flow, you need:

1. **APP_FID** - Your app's Farcaster ID number
2. **APP_MNEMONIC** - Your app's custody address mnemonic phrase

## 🔍 **How to Get These Credentials:**

### **Step 1: Create a Farcaster Account for Your App**

1. **Download Warpcast** - [warpcast.com](https://warpcast.com)
2. **Create a new account** specifically for your app
3. **Note down your FID** - This is your APP_FID
4. **Save your mnemonic phrase** - This is your APP_MNEMONIC

### **Step 2: Get Your FID (APP_FID)**

1. **Open Warpcast app**
2. **Go to your profile**
3. **Look for your FID number** (e.g., 12345, 67890)
4. **This is your APP_FID**

### **Step 3: Get Your Mnemonic (APP_MNEMONIC)**

1. **In Warpcast, go to Settings**
2. **Find "Recovery Phrase" or "Seed Phrase"**
3. **Write down the 12 or 24 words**
4. **This is your APP_MNEMONIC**

## ⚠️ **Important Security Notes:**

### **🔒 Keep These Secret:**
- **Never share your mnemonic phrase**
- **Never commit it to version control**
- **Store it securely (password manager, etc.)**
- **This gives full control over your app's Farcaster account**

### **💡 Best Practices:**
- Use a dedicated Farcaster account for your app
- Don't use your personal Farcaster account
- Consider using a hardware wallet for production

## 🛠️ **Setting Up Your Environment:**

### **1. Copy Environment File**
```bash
cp env.example .env
```

### **2. Edit .env File**
```env
# Farcaster App Configuration (Required for Ed25519 signer requests)
APP_FID=12345
APP_MNEMONIC="word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12"

# Optional: Neynar API key (for fallback)
NEYNAR_API_KEY=your_neynar_api_key_here

# Server Configuration
PORT=3000
```

### **3. Test Your Setup**
```bash
node test-signer.js
```

## 🧪 **Testing Your Implementation:**

### **Test 1: Basic Key Generation**
```bash
node -e "
import('./farcaster-signer.js').then(async ({default: FarcasterSignerManager}) => {
  const manager = new FarcasterSignerManager();
  const keypair = await manager.generateUserKeypair();
  console.log('✅ Keys generated:', keypair.publicKey.substring(0, 10) + '...');
});
"
```

### **Test 2: Complete Flow**
```bash
node test-signer.js
```

## 🚀 **Integration with Your Main App:**

### **1. Update server.js**

Replace the simulated posting with real Ed25519 implementation:

```javascript
// In your post-cast endpoint
if (signer.provider === 'direct_farcaster') {
  try {
    // Import the signer manager
    const { default: FarcasterSignerManager } = await import('./farcaster-signer.js');
    const signerManager = new FarcasterSignerManager();
    
    // Check if user has approved keys
    if (signer.status === 'approved') {
      // Use approved keys to post cast
      const result = await postCastWithApprovedKeys(text, signer.fid);
      // ... handle result
    } else {
      // User needs to approve signer first
      return res.status(400).json({
        error: 'Signer not approved yet',
        message: 'Please complete the signer approval process first'
      });
    }
  } catch (error) {
    // ... handle error
  }
}
```

### **2. Update User Connection Flow**

When a user connects, set up their signer:

```javascript
// In your create-signer endpoint
const signerManager = new FarcasterSignerManager();
const result = await signerManager.setupUserSigner(fid);

if (result.success) {
  // Store the signer info
  const signerInfo = {
    signerUuid: result.signedKeyRequest.signer_uuid,
    publicKey: result.keypair.publicKey,
    status: 'pending_approval',
    approvalUrl: result.approvalUrl,
    fid: result.userFid,
    createdAt: new Date(),
    provider: 'direct_farcaster',
    token: result.token
  };
  
  activeSigners.set(signerInfo.signerUuid, signerInfo);
  saveSession(signerInfo);
  
  res.json({
    success: true,
    signer: signerInfo,
    provider: 'direct_farcaster',
    message: 'Signer setup complete. Please approve in Farcaster app.'
  });
}
```

## 🔄 **Complete User Flow:**

### **Phase 1: User Connection**
1. User enters their FID
2. App generates Ed25519 keypair
3. App creates Signed Key Request
4. User gets approval URL/deeplink

### **Phase 2: User Approval**
1. User opens approval URL in Farcaster app
2. User approves the signer request
3. App polls for approval status
4. Once approved, keys are ready to use

### **Phase 3: Casting**
1. User types cast text
2. App signs message with approved Ed25519 keys
3. App submits signed message to Farcaster hub
4. Cast appears on Farcaster!

## 🆘 **Troubleshooting:**

### **"APP_FID not found"**
- Make sure you've added APP_FID to your .env file
- Verify the FID is correct (check in Warpcast)

### **"APP_MNEMONIC not found"**
- Make sure you've added APP_MNEMONIC to your .env file
- Verify the mnemonic phrase is correct
- Check for extra spaces or typos

### **"Signature generation failed"**
- Verify your APP_FID and APP_MNEMONIC are correct
- Make sure you're using the right network (mainnet vs testnet)
- Check that your app account has sufficient funds for gas

### **"Farcaster API error"**
- Check if the Farcaster API is accessible
- Verify your request format is correct
- Check if you've hit rate limits

## 🎉 **What You'll Have After Setup:**

- ✅ **Official Farcaster Integration** - Using the proper protocol
- ✅ **Ed25519 Cryptography** - Professional-grade security
- ✅ **Real User Approval Flow** - Users approve in Farcaster app
- ✅ **Complete Casting** - Actually posts to Farcaster
- ✅ **Free Forever** - No monthly costs
- ✅ **Production Ready** - Same quality as paid services

## 🚀 **Next Steps:**

1. **Set up your Farcaster app account**
2. **Get your APP_FID and APP_MNEMONIC**
3. **Update your .env file**
4. **Test the implementation**
5. **Integrate with your main app**
6. **Start posting real casts!**

---

**Need help? Check the Farcaster Discord or ask questions in the community!** 🐘✨
