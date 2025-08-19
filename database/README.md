# Database Structure

This folder contains the local database structure for the Farcaster Direct Casting application.

## Folders

- `users/` - Store user account information and Farcaster credentials
- `posts/` - Store post history and metadata
- `sessions/` - Store active user sessions and authentication tokens

## Data Storage

Currently using file-based storage. Each user, post, and session will be stored as individual JSON files.

## Future Considerations

- Consider migrating to a proper database (SQLite, PostgreSQL) for production use
- Implement data encryption for sensitive information
- Add backup and recovery mechanisms 