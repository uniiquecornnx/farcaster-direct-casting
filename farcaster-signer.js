// 🐘 Farcaster Signer Request Implementation
// This implements the official Farcaster signer request flow using Ed25519 keys

import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha512';
import { mnemonicToAccount, signTypedData } from 'viem/accounts';
import crypto from 'crypto';

// Configure Ed25519 to use SHA-512
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

// EIP-712 helper constants for Farcaster
const SIGNED_KEY_REQUEST_VALIDATOR_EIP_712_DOMAIN = {
  name: 'Farcaster SignedKeyRequestValidator',
  version: '1',
  chainId: 10,
  verifyingContract: '0x00000000fc700472606ed4fa22623acf62c60553',
};

const SIGNED_KEY_REQUEST_TYPE = [
  { name: 'requestFid', type: 'uint256' },
  { name: 'key', type: 'bytes' },
  { name: 'deadline', type: 'uint256' },
];

class FarcasterSignerManager {
  constructor() {
    this.farcasterClientApi = 'https://api.farcaster.xyz';
    this.appFid = process.env.APP_FID; // Your app's FID
    this.appMnemonic = process.env.APP_MNEMONIC; // Your app's mnemonic
  }

  // Generate Ed25519 keypair for a user
  async generateUserKeypair() {
    try {
      console.log('🔑 Generating Ed25519 keypair...');
      
      // Generate random private key (32 bytes)
      const privateKey = ed.utils.randomPrivateKey();
      
      // Derive public key from private key
      const publicKeyBytes = await ed.getPublicKey(privateKey);
      
      // Convert to hex format
      const privateKeyHex = Buffer.from(privateKey).toString('hex');
      const publicKeyHex = '0x' + Buffer.from(publicKeyBytes).toString('hex');
      
      console.log('✅ Keypair generated successfully');
      console.log('   Private Key:', privateKeyHex.substring(0, 10) + '...');
      console.log('   Public Key:', publicKeyHex.substring(0, 10) + '...');
      
      return {
        privateKey: privateKeyHex,
        publicKey: publicKeyHex,
        privateKeyBytes: privateKey,
        publicKeyBytes: publicKeyBytes
      };
    } catch (error) {
      console.error('❌ Error generating keypair:', error);
      throw new Error('Failed to generate Ed25519 keypair');
    }
  }

  // Generate Signed Key Request signature using app's custody address
  async generateSignedKeyRequestSignature(publicKey, userFid) {
    try {
      if (!this.appFid || !this.appMnemonic) {
        throw new Error('APP_FID and APP_MNEMONIC environment variables are required');
      }

      console.log('✍️  Generating Signed Key Request signature...');
      
      // Create account from mnemonic
      const account = mnemonicToAccount(this.appMnemonic);
      
      // Set deadline (24 hours from now)
      const deadline = Math.floor(Date.now() / 1000) + 86400;
      
      // Sign the typed data
      const signature = await account.signTypedData({
        domain: SIGNED_KEY_REQUEST_VALIDATOR_EIP_712_DOMAIN,
        types: {
          SignedKeyRequest: SIGNED_KEY_REQUEST_TYPE,
        },
        primaryType: 'SignedKeyRequest',
        message: {
          requestFid: BigInt(this.appFid),
          key: publicKey,
          deadline: BigInt(deadline),
        },
      });
      
      console.log('✅ Signed Key Request signature generated');
      console.log('   App FID:', this.appFid);
      console.log('   Deadline:', new Date(deadline * 1000).toISOString());
      
      return {
        signature,
        deadline,
        appFid: this.appFid
      };
    } catch (error) {
      console.error('❌ Error generating signature:', error);
      throw new Error('Failed to generate Signed Key Request signature');
    }
  }

  // Create a Signed Key Request using Farcaster client API
  async createSignedKeyRequest(userFid, publicKey, signature, deadline) {
    try {
      console.log('🚀 Creating Signed Key Request...');
      
      const requestData = {
        key: publicKey,
        requestFid: parseInt(userFid),
        signature,
        deadline,
      };
      
      console.log('   Request data:', {
        key: publicKey.substring(0, 10) + '...',
        requestFid: userFid,
        deadline: new Date(deadline * 1000).toISOString()
      });
      
      const response = await fetch(`${this.farcasterClientApi}/v2/signed-key-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Farcaster API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }
      
      const data = await response.json();
      const signedKeyRequest = data.result.signedKeyRequest;
      
      console.log('✅ Signed Key Request created successfully');
      console.log('   Token:', signedKeyRequest.token.substring(0, 10) + '...');
      console.log('   State:', signedKeyRequest.state);
      
      return signedKeyRequest;
    } catch (error) {
      console.error('❌ Error creating Signed Key Request:', error);
      throw new Error(`Failed to create Signed Key Request: ${error.message}`);
    }
  }

  // Check the status of a Signed Key Request
  async checkSignedKeyRequestStatus(token) {
    try {
      console.log('🔍 Checking Signed Key Request status...');
      
      const response = await fetch(`${this.farcasterClientApi}/v2/signed-key-request?token=${token}`);
      
      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status}`);
      }
      
      const data = await response.json();
      const signedKeyRequest = data.result.signedKeyRequest;
      
      console.log('✅ Status check successful');
      console.log('   State:', signedKeyRequest.state);
      console.log('   User FID:', signedKeyRequest.userFid || 'Not approved yet');
      
      return signedKeyRequest;
    } catch (error) {
      console.error('❌ Error checking status:', error);
      throw new Error(`Failed to check status: ${error.message}`);
    }
  }

  // Complete flow: Generate keys, create request, and get approval URL
  async setupUserSigner(userFid) {
    try {
      console.log('🚀 Setting up user signer for FID:', userFid);
      
      // Step 1: Generate Ed25519 keypair
      const keypair = await this.generateUserKeypair();
      
      // Step 2: Generate Signed Key Request signature
      const signatureData = await this.generateSignedKeyRequestSignature(
        keypair.publicKey, 
        userFid
      );
      
      // Step 3: Create Signed Key Request
      const signedKeyRequest = await this.createSignedKeyRequest(
        userFid,
        keypair.publicKey,
        signatureData.signature,
        signatureData.deadline
      );
      
      // Return everything needed for the user flow
      return {
        success: true,
        userFid: userFid,
        keypair: keypair,
        signedKeyRequest: signedKeyRequest,
        approvalUrl: signedKeyRequest.deeplinkUrl,
        token: signedKeyRequest.token,
        state: signedKeyRequest.state,
        message: 'User signer setup complete. Present approval URL to user.'
      };
      
    } catch (error) {
      console.error('❌ User signer setup failed:', error);
      return {
        success: false,
        error: error.message,
        userFid: userFid
      };
    }
  }

  // Poll for signer approval (call this periodically)
  async waitForSignerApproval(token, maxAttempts = 30, intervalMs = 2000) {
    console.log('⏳ Waiting for user to approve signer...');
    console.log('   Max attempts:', maxAttempts);
    console.log('   Check interval:', intervalMs + 'ms');
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`   Attempt ${attempt}/${maxAttempts}...`);
        
        const status = await this.checkSignedKeyRequestStatus(token);
        
        if (status.state === 'completed') {
          console.log('🎉 Signer approved successfully!');
          return {
            success: true,
            state: status.state,
            userFid: status.userFid,
            message: 'Signer has been approved and is ready to use!'
          };
        } else if (status.state === 'approved') {
          console.log('✅ Signer approved, waiting for onchain confirmation...');
          return {
            success: true,
            state: status.state,
            userFid: status.userFid,
            message: 'Signer approved, waiting for blockchain confirmation...'
          };
        } else if (status.state === 'revoked') {
          console.log('❌ Signer was revoked by user');
          return {
            success: false,
            state: status.state,
            message: 'User revoked the signer request'
          };
        }
        
        // Wait before next check
        await new Promise(resolve => setTimeout(resolve, intervalMs));
        
      } catch (error) {
        console.log(`   Attempt ${attempt} failed:`, error.message);
        
        if (attempt === maxAttempts) {
          return {
            success: false,
            error: 'Max attempts reached',
            message: 'User did not approve signer within the expected time'
          };
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }
  }

  // Get environment status
  getEnvironmentStatus() {
    const status = {
      appFid: !!this.appFid,
      appMnemonic: !!this.appMnemonic,
      farcasterApi: this.farcasterClientApi,
      ready: !!(this.appFid && this.appMnemonic)
    };
    
    if (!status.ready) {
      status.missing = [];
      if (!this.appFid) status.missing.push('APP_FID');
      if (!this.appMnemonic) status.missing.push('APP_MNEMONIC');
    }
    
    return status;
  }
}

// Export the class
export default FarcasterSignerManager;

// Example usage:
/*
const signerManager = new FarcasterSignerManager();

// Check if environment is ready
const envStatus = signerManager.getEnvironmentStatus();
if (!envStatus.ready) {
  console.log('❌ Environment not ready. Missing:', envStatus.missing);
  process.exit(1);
}

// Setup user signer
const result = await signerManager.setupUserSigner(12345);
if (result.success) {
  console.log('✅ Setup complete!');
  console.log('   Approval URL:', result.approvalUrl);
  
  // Wait for approval
  const approval = await signerManager.waitForSignerApproval(result.token);
  if (approval.success) {
    console.log('🎉 User approved signer!');
  }
}
*/
