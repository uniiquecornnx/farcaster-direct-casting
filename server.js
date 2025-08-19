import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { NeynarAPIClient, Configuration } from '@neynar/nodejs-sdk';
import qrcode from 'qrcode';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Initialize Neynar client (if API key is available) - now as fallback
let neynarClient = null;
if (process.env.NEYNAR_API_KEY) {
  try {
    const config = new Configuration({
      apiKey: process.env.NEYNAR_API_KEY,
    });
    neynarClient = new NeynarAPIClient(config);
    console.log('✅ Neynar client initialized (available as fallback)');
  } catch (error) {
    console.log('⚠️  Neynar client initialization failed:', error.message);
  }
}

// Import database functions
import { saveUser, savePost, saveSession, getSession, updateSession, deleteSession, getDatabaseStats } from './database/db.js';

// Store active signers in memory (in production, use a database)
const activeSigners = new Map();

// Simple rate limiting
const rateLimit = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;

// Farcaster API configuration - PRIMARY METHOD
const FARCASTER_API_BASE = 'https://api.farcaster.xyz';
const FARCASTER_HUB_BASE = 'https://nemes.farcaster.xyz:2281'; // Public hub

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Rate limiting middleware
function checkRateLimit(identifier) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;
  
  if (!rateLimit.has(identifier)) {
    rateLimit.set(identifier, []);
  }
  
  const requests = rateLimit.get(identifier);
  const recentRequests = requests.filter(timestamp => timestamp > windowStart);
  
  if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  
  recentRequests.push(now);
  rateLimit.set(identifier, recentRequests);
  return true;
}

// Create a new signer for a user (SIWN flow)
app.post('/api/create-signer', async (req, res) => {
  try {
    const { fid, signerUuid } = req.body;
    
    if (!fid || !signerUuid) {
      return res.status(400).json({ 
        error: 'FID and signerUuid are required for SIWN flow' 
      });
    }

    const fidNum = parseInt(fid);
    
    // Rate limiting
    const clientIP = req.ip || req.connection.remoteAddress;
    if (!checkRateLimit(clientIP)) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    // For SIWN, we just store the signer info
    console.log('✅ SIWN signer received for FID:', fidNum);
    
    const signerInfo = {
      signerUuid: signerUuid,
      status: 'approved', // SIWN signers are pre-approved
      fid: fidNum,
      createdAt: new Date(),
      provider: 'neynar_siwn'
    };
    
    activeSigners.set(signerUuid, signerInfo);
    saveSession(signerInfo);
    
    console.log('✅ SIWN signer stored successfully');
    
    res.json({
      success: true,
      signer: signerInfo,
      provider: 'neynar_siwn',
      message: 'SIWN signer connected successfully! Ready to cast.',
      note: 'Sign In with Neynar handles all authentication automatically'
    });

  } catch (error) {
    console.error('Error creating SIWN signer:', error);
    res.status(500).json({ 
      error: 'Failed to create SIWN signer',
      details: error.message 
    });
  }
});

// Check signer status
app.get('/api/signer-status/:signerUuid', async (req, res) => {
  try {
    const { signerUuid } = req.params;
    const signer = activeSigners.get(signerUuid);
    
    if (!signer) {
      return res.status(404).json({ error: 'Signer not found' });
    }

    // For Neynar signers, check actual status
    if (signer.provider === 'neynar' && neynarClient) {
      try {
        const neynarSigner = await neynarClient.getSigner(signerUuid);
        
        // Update stored signer info
        const signerInfo = {
          ...signer,
          status: neynarSigner.status,
          updatedAt: new Date()
        };

        activeSigners.set(signerUuid, signerInfo);
        updateSession(signer.signer_uuid, signerInfo);
        
        return res.json({
          success: true,
          signer: signerInfo
        });
      } catch (error) {
        console.error('Error checking Neynar signer status:', error);
      }
    }

    // For direct API signers, check real-time Ed25519 status if available
    if (signer.provider === 'direct_farcaster' && signer.token) {
      try {
        const { default: FarcasterSignerManager } = await import('./farcaster-signer.js');
        const signerManager = new FarcasterSignerManager();
        
        const realStatus = await signerManager.checkSignedKeyRequestStatus(signer.token);
        
        // Update the stored status if it changed
        if (realStatus.state !== signer.status) {
          signer.status = realStatus.state;
          if (realStatus.userFid) {
            signer.fid = realStatus.userFid;
          }
          updateSession(signerUuid, signer);
        }
        
        return res.json({
          success: true,
          signer: signer,
          status: signer.status,
          provider: signer.provider,
          realTimeStatus: realStatus,
          message: realStatus.state === 'completed' ? 
            '🎉 Signer approved and ready for casting!' : 
            `Signer status: ${realStatus.state}`
        });
      } catch (statusError) {
        console.error('Error checking real-time Ed25519 status:', statusError);
        // Fall back to stored status
      }
    }

    // Return stored status for other cases
    res.json({
      success: true,
      signer: signer,
      status: signer.status,
      provider: signer.provider
    });

  } catch (error) {
    console.error('Error checking signer status:', error);
    res.status(500).json({ 
      error: 'Failed to check signer status',
      details: error.message 
    });
  }
});

// Post a cast using the signer
app.post('/api/post-cast', async (req, res) => {
  try {
    const { signerUuid, text, parentUrl } = req.body;
    
    if (!signerUuid || !text) {
      return res.status(400).json({ 
        error: 'Signer UUID and text are required' 
      });
    }

    // Rate limiting
    const clientIP = req.ip || req.connection.remoteAddress;
    if (!checkRateLimit(clientIP)) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    // Validate text length (Farcaster has limits)
    if (text.length > 320) {
      return res.status(400).json({ 
        error: 'Cast text must be 320 characters or less' 
      });
    }

    // Check if signer is approved
    const signer = activeSigners.get(signerUuid);
    if (!signer) {
      return res.status(400).json({ error: 'Signer not found' });
    }

    if (signer.status !== 'approved') {
      return res.status(400).json({ 
        error: 'Signer not approved yet. Please complete the approval process first.' 
      });
    }

    // Handle SIWN signers (pre-approved)
    if (signer.provider === 'neynar_siwn') {
      try {
        console.log('📝 Posting cast using SIWN signer...');
        console.log('   User FID:', signer.fid);
        console.log('   Cast text:', text);
        console.log('   Signer UUID:', signer.signerUuid);
        
        // Use Neynar to post the cast
        if (neynarClient) {
          try {
            const cast = await neynarClient.publishCast({
              signerUuid: signer.signerUuid,
              text: text
            });
            
            // Store the cast in our database
            const castInfo = {
              hash: cast.hash,
              text: cast.text,
              signerUuid: signer.signerUuid,
              fid: signer.fid,
              timestamp: new Date(),
              provider: 'neynar_siwn'
            };
            
            savePost(castInfo);
            
            console.log('✅ Cast posted successfully via SIWN!');
            
            return res.json({
              success: true,
              cast: castInfo,
              provider: 'neynar_siwn',
              message: '🎉 Cast posted successfully to Farcaster!'
            });
            
          } catch (neynarError) {
            console.error('❌ Neynar posting failed:', neynarError);
            return res.status(500).json({
              error: 'Failed to post cast via Neynar',
              details: neynarError.message,
              note: 'SIWN signer is approved but Neynar posting failed. Please try again.'
            });
          }
        } else {
          return res.status(500).json({
            error: 'Neynar client not available',
            message: 'SIWN signer is approved but Neynar client is not configured.',
            note: 'Please add NEYNAR_API_KEY to your .env file to enable posting.'
          });
        }
      } catch (error) {
        console.error('❌ SIWN cast posting failed:', error);
        return res.status(500).json({
          error: 'Failed to post cast with SIWN',
          details: error.message
        });
      }
    }

    // Handle Direct Farcaster API signers (Ed25519)
    if (signer.provider === 'direct_farcaster') {
      try {
        // Check if we have the Ed25519 keypair stored
        if (!signer.keypair || !signer.keypair.privateKey) {
          return res.status(400).json({
            error: 'Ed25519 keys not found',
            message: 'Signer setup incomplete. Please reconnect your Farcaster account.',
            currentStatus: signer.status
          });
        }

        // Check if signer is actually approved on-chain
        if (signer.token) {
          const { default: FarcasterSignerManager } = await import('./farcaster-signer.js');
          const signerManager = new FarcasterSignerManager();
          
          try {
            const status = await signerManager.checkSignedKeyRequestStatus(signer.token);
            
            if (status.state === 'completed') {
              // Signer is approved! We can post real casts
              console.log('🎉 Signer approved! Posting real cast to Farcaster...');
              console.log('   User FID:', signer.fid);
              console.log('   Cast text:', text);
              console.log('   Public Key:', signer.publicKey.substring(0, 10) + '...');
              
              // TODO: Implement actual cast submission using @farcaster/hub-nodejs
              // For now, we'll indicate success but note that hub submission needs to be implemented
              const castInfo = {
                hash: 'pending_hub_submission', // Will be real hash after hub submission
                text: text,
                signerUuid,
                fid: signer.fid,
                timestamp: new Date(),
                parentUrl: parentUrl || null,
                provider: 'direct_farcaster',
                status: 'ready_for_hub_submission',
                note: 'Ed25519 keys approved! Cast is ready to submit to Farcaster hub.',
                nextStep: 'Implement cast submission to Farcaster hub using @farcaster/hub-nodejs'
              };

              savePost(castInfo);

              return res.json({
                success: true,
                cast: castInfo,
                provider: 'direct_farcaster',
                message: '🎉 Ed25519 signer approved! Cast ready for Farcaster hub submission.',
                note: 'Your cryptographic keys are working! The final step is submitting to Farcaster hubs.',
                nextStep: 'Implement hub submission to complete real Farcaster posting'
              });
              
            } else if (status.state === 'approved') {
              return res.status(400).json({
                error: 'Signer approved, waiting for on-chain confirmation',
                message: 'Your signer is approved but waiting for blockchain confirmation. Please wait a few minutes.',
                currentStatus: status.state,
                approvalUrl: signer.approvalUrl
              });
            } else {
              return res.status(400).json({
                error: 'Signer not fully approved',
                message: `Signer status: ${status.state}. Please complete the approval process.`,
                currentStatus: status.state,
                approvalUrl: signer.approvalUrl
              });
            }
            
          } catch (statusError) {
            console.error('❌ Error checking signer status:', statusError);
            return res.status(500).json({
              error: 'Failed to verify signer status',
              details: statusError.message,
              note: 'Could not verify if your Ed25519 keys are approved. Please try again.'
            });
          }
        } else {
          return res.status(400).json({
            error: 'Signer token missing',
            message: 'Signer setup incomplete. Please reconnect your Farcaster account.',
            currentStatus: signer.status
          });
        }
        
      } catch (error) {
        console.error('❌ Ed25519 cast posting failed:', error);
        return res.status(500).json({
          error: 'Failed to post cast with Ed25519',
          details: error.message,
          note: 'Ed25519 implementation error. Check server logs for details.'
        });
      }
    }

    // Fallback to Neynar if available
    if (signer.provider === 'neynar' && neynarClient) {
      try {
        const cast = await neynarClient.publishCast({
          signerUuid,
          text,
          parentUrl: parentUrl || undefined
        });

        // Store the cast in our database
        const castInfo = {
          hash: cast.hash,
          text: cast.text,
          signerUuid,
          fid: signer.fid,
          timestamp: new Date(),
          parentUrl: parentUrl || null,
          provider: 'neynar'
        };

        savePost(castInfo);

        return res.json({
          success: true,
          cast: castInfo,
          provider: 'neynar'
        });
      } catch (neynarError) {
        console.log('Neynar posting failed:', neynarError.message);
        return res.status(500).json({ 
          error: 'Neynar posting failed, but Direct API is available',
          details: neynarError.message 
        });
      }
    }

    res.status(400).json({ error: 'Unknown signer provider' });

  } catch (error) {
    console.error('Error posting cast:', error);
    res.status(500).json({ 
      error: 'Failed to post cast',
      details: error.message 
    });
  }
});

// Get QR code for signer approval
app.get('/api/qr-code/:signerUuid', async (req, res) => {
  try {
    const { signerUuid } = req.params;
    const signer = activeSigners.get(signerUuid);
    
    if (!signer) {
      return res.status(404).json({ error: 'Signer not found' });
    }

    if (signer.provider === 'neynar') {
      // Generate QR code for the approval URL
      const qrCodeDataUrl = await qrcode.toDataURL(signer.approvalUrl);
      
      res.json({
        success: true,
        qrCode: qrCodeDataUrl,
        approvalUrl: signer.approvalUrl,
        provider: 'neynar'
      });
    } else {
      // For direct API, use the real approval URL from the Ed25519 signer request
      if (signer.approvalUrl && signer.approvalUrl.startsWith('farcaster://')) {
        // This is a real Farcaster approval deeplink
        const qrCodeDataUrl = await qrcode.toDataURL(signer.approvalUrl);
        
        res.json({
          success: true,
          qrCode: qrCodeDataUrl,
          approvalUrl: signer.approvalUrl,
          provider: 'direct_farcaster',
          message: '🔐 Scan QR code to approve your Ed25519 signer in Farcaster',
          instructions: [
            '1. Open Farcaster app (Warpcast, etc.)',
            '2. Scan this QR code or click the approval link',
            '3. Approve the signer request in your app',
            '4. Return here to check approval status'
          ],
          note: 'This approval URL will open directly in your Farcaster app'
        });
      } else {
        // Fallback to Warpcast settings if no approval URL
        const approvalUrl = 'https://warpcast.com/~/settings/apps';
        const qrCodeDataUrl = await qrcode.toDataURL(approvalUrl);
        
        res.json({
          success: true,
          qrCode: qrCodeDataUrl,
          approvalUrl: approvalUrl,
          provider: 'direct_farcaster',
          message: 'Please go to Warpcast settings to approve this app',
          instructions: [
            '1. Open Warpcast app',
            '2. Go to Settings → Apps',
            '3. Find this app and approve it',
            '4. Return here to continue'
          ]
        });
      }
    }

  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({ 
      error: 'Failed to generate QR code',
      details: error.message 
    });
  }
});

// Get user info by FID - PRIORITIZES DIRECT API
app.get('/api/user/:fid', async (req, res) => {
  try {
    const { fid } = req.params;
    
    // PRIORITY: Try Direct Farcaster API first
    try {
      const response = await fetch(`${FARCASTER_API_BASE}/v2/user?fid=${fid}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.result && data.result.user) {
          const user = data.result.user;
          
          // Save user to database
          saveUser(user);

          return res.json({
            success: true,
            user: user,
            provider: 'direct_farcaster'
          });
        }
      }
    } catch (directApiError) {
      console.log('Direct API failed, trying Neynar fallback:', directApiError.message);
    }

    // Fallback to Neynar if available
    if (neynarClient) {
      try {
        const { users } = await neynarClient.fetchBulkUsers({ 
          fids: [parseInt(fid)] 
        });
        
        if (users && users.length > 0) {
          const user = users[0];
          
          // Save user to database
          saveUser(user);

          return res.json({
            success: true,
            user: user,
            provider: 'neynar'
          });
        }
      } catch (neynarError) {
        console.log('Neynar also failed:', neynarError.message);
      }
    }

    // Both APIs failed
    throw new Error('Both Direct Farcaster API and Neynar failed to fetch user');

  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ 
      error: 'Failed to fetch user',
      details: error.message,
      suggestion: 'Check if the FID is correct and try again'
    });
  }
});

// Get database statistics
app.get('/api/stats', async (req, res) => {
  try {
    const stats = getDatabaseStats();
    res.json({
      success: true,
      stats: stats,
      providers: {
        direct_farcaster: 'primary',
        neynar: neynarClient ? 'fallback' : 'unavailable'
      },
      api_status: {
        direct_farcaster: 'active',
        neynar: neynarClient ? 'available' : 'no_api_key'
      }
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ 
      error: 'Failed to get database stats',
      details: error.message 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📱 Farcaster Direct Casting ready!`);
  console.log(`🎯 PRIMARY: Direct Farcaster API (FREE)`);
  
  if (neynarClient) {
    console.log('✅ Neynar available as fallback option');
  } else {
    console.log('⚠️  Neynar not available (no API key) - using Direct API only');
  }
  
  console.log('🔄 App automatically uses best available API');
  console.log('💡 To enable Neynar: add NEYNAR_API_KEY to .env file');
}); 