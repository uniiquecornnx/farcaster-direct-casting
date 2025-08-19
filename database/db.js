import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database paths
const USERS_DIR = path.join(__dirname, 'users');
const POSTS_DIR = path.join(__dirname, 'posts');
const SESSIONS_DIR = path.join(__dirname, 'sessions');

// Ensure directories exist
[USERS_DIR, POSTS_DIR, SESSIONS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Helper function to read JSON file
function readJsonFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return null;
  }
}

// Helper function to write JSON file
function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error);
    return false;
  }
}

// User management
export function saveUser(userData) {
  const filePath = path.join(USERS_DIR, `${userData.fid}.json`);
  return writeJsonFile(filePath, {
    ...userData,
    updatedAt: new Date().toISOString()
  });
}

export function getUser(fid) {
  const filePath = path.join(USERS_DIR, `${fid}.json`);
  return readJsonFile(filePath);
}

// Post management
export function savePost(postData) {
  const timestamp = Date.now();
  const fileName = `${timestamp}_${postData.hash}.json`;
  const filePath = path.join(POSTS_DIR, fileName);
  
  const postRecord = {
    ...postData,
    id: fileName.replace('.json', ''),
    createdAt: new Date().toISOString(),
    timestamp
  };
  
  return writeJsonFile(filePath, postRecord);
}

export function getPostsByUser(fid, limit = 50) {
  try {
    const files = fs.readdirSync(POSTS_DIR);
    const posts = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const post = readJsonFile(path.join(POSTS_DIR, file));
        if (post && post.fid === fid) {
          posts.push(post);
        }
      }
    }
    
    // Sort by timestamp descending and limit results
    return posts
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  } catch (error) {
    console.error('Error reading posts:', error);
    return [];
  }
}

export function getAllPosts(limit = 100) {
  try {
    const files = fs.readdirSync(POSTS_DIR);
    const posts = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const post = readJsonFile(path.join(POSTS_DIR, file));
        if (post) {
          posts.push(post);
        }
      }
    }
    
    // Sort by timestamp descending and limit results
    return posts
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  } catch (error) {
    console.error('Error reading posts:', error);
    return [];
  }
}

// Session management
export function saveSession(sessionData) {
  const filePath = path.join(SESSIONS_DIR, `${sessionData.signerUuid}.json`);
  return writeJsonFile(filePath, {
    ...sessionData,
    updatedAt: new Date().toISOString()
  });
}

export function getSession(signerUuid) {
  const filePath = path.join(SESSIONS_DIR, `${signerUuid}.json`);
  return readJsonFile(filePath);
}

export function updateSession(signerUuid, updates) {
  const session = getSession(signerUuid);
  if (session) {
    const updatedSession = { ...session, ...updates, updatedAt: new Date().toISOString() };
    return saveSession(updatedSession);
  }
  return false;
}

export function deleteSession(signerUuid) {
  try {
    const filePath = path.join(SESSIONS_DIR, `${signerUuid}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error deleting session ${signerUuid}:`, error);
    return false;
  }
}

// Cleanup old sessions (older than 24 hours)
export function cleanupOldSessions() {
  try {
    const files = fs.readdirSync(SESSIONS_DIR);
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const session = readJsonFile(path.join(SESSIONS_DIR, file));
        if (session && session.updatedAt) {
          const sessionAge = now - new Date(session.updatedAt).getTime();
          if (sessionAge > oneDay) {
            deleteSession(session.signerUuid);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning up sessions:', error);
  }
}

// Database statistics
export function getDatabaseStats() {
  try {
    const userCount = fs.readdirSync(USERS_DIR).filter(f => f.endsWith('.json')).length;
    const postCount = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.json')).length;
    const sessionCount = fs.readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.json')).length;
    
    return {
      users: userCount,
      posts: postCount,
      sessions: sessionCount,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error getting database stats:', error);
    return { users: 0, posts: 0, sessions: 0, lastUpdated: new Date().toISOString() };
  }
}

// Run cleanup every hour
setInterval(cleanupOldSessions, 60 * 60 * 1000); 