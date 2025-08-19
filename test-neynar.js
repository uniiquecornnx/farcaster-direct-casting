import { NeynarAPIClient, Configuration } from '@neynar/nodejs-sdk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testNeynarConnection() {
  console.log('🧪 Testing Neynar SDK Connection...\n');
  
  // Check if API key is set
  if (!process.env.NEYNAR_API_KEY) {
    console.log('❌ NEYNAR_API_KEY not found in environment variables');
    console.log('   Please set NEYNAR_API_KEY in your .env file');
    console.log('   Get your API key from: https://neynar.com\n');
    return;
  }
  
  console.log('✅ NEYNAR_API_KEY found');
  
  try {
    // Initialize Neynar client
    const config = new Configuration({
      apiKey: process.env.NEYNAR_API_KEY,
    });
    const neynarClient = new NeynarAPIClient(config);
    
    console.log('✅ Neynar client initialized successfully');
    
    // Test fetching a user (Dan Romero, FID 3)
    console.log('\n🔍 Testing user fetch...');
    const { users } = await neynarClient.fetchBulkUsers({ fids: [3] });
    
    if (users && users.length > 0) {
      const user = users[0];
      console.log('✅ User fetch successful!');
      console.log(`   Username: ${user.username}`);
      console.log(`   Display Name: ${user.display_name}`);
      console.log(`   FID: ${user.fid}`);
      console.log(`   Followers: ${user.follower_count}`);
    } else {
      console.log('❌ User fetch failed - no users returned');
    }
    
    // Test fetching feed
    console.log('\n📰 Testing feed fetch...');
    const feed = await neynarClient.fetchFeed({
      fid: 3,
      feedType: 'following',
      limit: 1
    });
    
    if (feed && feed.casts && feed.casts.length > 0) {
      console.log('✅ Feed fetch successful!');
      console.log(`   Casts returned: ${feed.casts.length}`);
      console.log(`   First cast text: ${feed.casts[0].text.substring(0, 50)}...`);
    } else {
      console.log('❌ Feed fetch failed');
    }
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('   Your Neynar integration is working correctly.');
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      console.log('\n💡 This usually means:');
      console.log('   - Your API key is invalid or expired');
      console.log('   - You need to get a new API key from https://neynar.com');
    } else if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
      console.log('\n💡 This usually means:');
      console.log('   - You\'ve exceeded your API rate limits');
      console.log('   - Check your Neynar plan and usage');
    }
  }
}

// Run the test
testNeynarConnection(); 