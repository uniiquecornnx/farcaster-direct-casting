// 🧪 Test file for Farcaster Signer Implementation
// Run this to test your Ed25519 key generation and signer setup

import FarcasterSignerManager from './farcaster-signer.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testSignerImplementation() {
  console.log('🧪 Testing Farcaster Signer Implementation...\n');
  
  // Create signer manager instance
  const signerManager = new FarcasterSignerManager();
  
  // Check environment status
  console.log('🔍 Checking environment configuration...');
  const envStatus = signerManager.getEnvironmentStatus();
  
  if (!envStatus.ready) {
    console.log('❌ Environment not ready!');
    console.log('   Missing variables:', envStatus.missing);
    console.log('\n💡 To fix this:');
    console.log('   1. Copy env.example to .env');
    console.log('   2. Add your APP_FID and APP_MNEMONIC');
    console.log('   3. Get these from Farcaster app registration');
    console.log('\n📚 Read FARCASTER_API_GUIDE.md for setup instructions');
    return;
  }
  
  console.log('✅ Environment ready!');
  console.log('   App FID:', envStatus.appFid);
  console.log('   App Mnemonic:', envStatus.appMnemonic ? '✅ Set' : '❌ Missing');
  console.log('   Farcaster API:', envStatus.farcasterApi);
  
  // Test key generation
  console.log('\n🔑 Testing Ed25519 key generation...');
  try {
    const keypair = await signerManager.generateUserKeypair();
    console.log('✅ Key generation successful!');
    console.log('   Private Key (first 10 chars):', keypair.privateKey.substring(0, 10) + '...');
    console.log('   Public Key (first 10 chars):', keypair.publicKey.substring(0, 10) + '...');
    console.log('   Key lengths:', {
      privateKey: keypair.privateKey.length,
      publicKey: keypair.publicKey.length
    });
  } catch (error) {
    console.log('❌ Key generation failed:', error.message);
    return;
  }
  
  // Test signature generation (if environment is ready)
  console.log('\n✍️  Testing Signed Key Request signature generation...');
  try {
    const testFid = 12345; // Test FID
    const testPublicKey = '0x' + 'a'.repeat(64); // Test public key
    
    const signatureData = await signerManager.generateSignedKeyRequestSignature(
      testPublicKey, 
      testFid
    );
    
    console.log('✅ Signature generation successful!');
    console.log('   Signature length:', signatureData.signature.length);
    console.log('   Deadline:', new Date(signatureData.deadline * 1000).toISOString());
    console.log('   App FID used:', signatureData.appFid);
  } catch (error) {
    console.log('❌ Signature generation failed:', error.message);
    console.log('   This is expected if APP_FID/APP_MNEMONIC are not set correctly');
    return;
  }
  
  // Test complete flow (simulation)
  console.log('\n🚀 Testing complete signer setup flow...');
  try {
    const testFid = 12345;
    const result = await signerManager.setupUserSigner(testFid);
    
    if (result.success) {
      console.log('✅ Complete flow successful!');
      console.log('   User FID:', result.userFid);
      console.log('   Approval URL:', result.approvalUrl);
      console.log('   Token:', result.token.substring(0, 10) + '...');
      console.log('   State:', result.state);
      console.log('\n🎯 Next steps:');
      console.log('   1. Present approval URL to user');
      console.log('   2. User approves in Farcaster app');
      console.log('   3. Poll for approval status');
      console.log('   4. Use Ed25519 keys to post casts');
    } else {
      console.log('❌ Complete flow failed:', result.error);
    }
  } catch (error) {
    console.log('❌ Complete flow failed:', error.message);
  }
  
  console.log('\n🎉 Testing complete!');
  console.log('\n📚 Next steps:');
  console.log('   1. Set up your APP_FID and APP_MNEMONIC in .env');
  console.log('   2. Test with a real Farcaster ID');
  console.log('   3. Integrate with your main app');
  console.log('   4. Implement actual casting using the approved keys');
}

// Run the test
testSignerImplementation().catch(console.error);
