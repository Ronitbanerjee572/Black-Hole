# 🚀 Deployment Guide: Render + Netlify

## 📋 Overview
Deploy your Black Hole game with separate backend (Render) and frontend (Netlify) services for optimal performance and scalability.

## 🗂️ Project Structure
```
Bingo/
├── server/                 # Backend for Render
│   ├── index.js           # Main server file
│   ├── package.json       # Server dependencies
│   └── manager/           # Game logic
│       ├── roomManager.js
│       └── gameManager.js
├── src/                   # Frontend for Netlify
│   └── components/
├── package.json           # Frontend dependencies
└── vite.config.js         # Build configuration
```

## 🖥️ Backend Deployment (Render)

### Step 1: Prepare Server
```bash
cd server
npm install
```

### Step 2: Update Server URL
In `src/components/PaperBlackHoleGame.jsx`, line 29:
```javascript
const serverUrl = process.env.NODE_ENV === 'production' 
  ? 'https://your-server-name.onrender.com'  // 👈 UPDATE THIS
  : 'http://localhost:3001'
```

### Step 3: Deploy to Render
1. **Create Render Account**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub

2. **Create New Web Service**
   - Click "New" → "Web Service"
   - Connect your GitHub repository
   - Select the `server` folder as root directory
   - Use these settings:
     ```
     Runtime: Node
     Build Command: npm install
     Start Command: npm start
     Environment: Production
     ```

3. **Environment Variables** (Optional)
   ```
   NODE_ENV=production
   PORT=3001
   ```

4. **Deploy!**
   - Render will automatically deploy your server
   - Note your server URL: `https://your-app-name.onrender.com`

### Step 4: Test Server
Visit these endpoints to verify:
- `https://your-app-name.onrender.com/` - API status
- `https://your-app-name.onrender.com/health` - Health check

## 🌐 Frontend Deployment (Netlify)

### Step 1: Install Socket.IO Client
```bash
cd ..  # Back to root
npm install socket.io-client
```

### Step 2: Update Vite Config
Create/Update `vite.config.js`:
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  },
  server: {
    port: 5173
  }
})
```

### Step 3: Build Frontend
```bash
npm run build
```

### Step 4: Deploy to Netlify
1. **Create Netlify Account**
   - Go to [netlify.com](https://netlify.com)
   - Sign up with GitHub

2. **Create New Site**
   - Click "Add new site" → "Import an existing project"
   - Connect your GitHub repository
   - Build settings:
     ```
     Build command: npm run build
     Publish directory: dist
     ```

3. **Environment Variables** (Important!)
   ```
   NODE_ENV=production
   VITE_SERVER_URL=https://your-server-name.onrender.com
   ```

4. **Deploy!**
   - Netlify will automatically build and deploy
   - Note your site URL: `https://your-app-name.netlify.app`

## 🔧 Configuration Updates

### Update Frontend Server URL
In `src/components/PaperBlackHoleGame.jsx`:

```javascript
// Replace line 28-30 with:
const serverUrl = process.env.NODE_ENV === 'production' 
  ? import.meta.env.VITE_SERVER_URL || 'https://your-server-name.onrender.com'
  : 'http://localhost:3001'
```

### Update Lobby Component
In `src/components/Lobby.jsx`, update multiplayer logic to use Socket.IO:

```javascript
const handleCreateRoom = () => {
  if (!playerName.trim()) {
    alert('Please enter your name')
    return
  }
  
  // For multiplayer, let the server create the room
  onStartGame({ 
    mode: 'multiplayer', 
    type: 'create', 
    playerName 
  })
}

const handleJoinRoom = () => {
  if (!playerName.trim()) {
    alert('Please enter your name')
    return
  }
  if (!roomCode.trim()) {
    alert('Please enter a room code')
    return
  }
  
  onStartGame({ 
    mode: 'multiplayer', 
    type: 'join', 
    roomCode: roomCode.toUpperCase(), 
    playerName 
  })
}
```

## 🧪 Testing Deployment

### 1. Test Both Services
```bash
# Test backend
curl https://your-server-name.onrender.com/health

# Test frontend
# Visit https://your-app-name.netlify.app
```

### 2. Test Multiplayer
1. Open your Netlify site in two browser tabs
2. Create a room in one tab
3. Join with the room code in the other tab
4. Verify real-time synchronization

## 🔒 CORS Configuration

Your server already includes CORS for Netlify. The server configuration allows:
- `.netlify.app` domains
- `.vercel.app` domains  
- `localhost` for development

## 🚨 Common Issues & Solutions

### Issue: CORS Errors
**Solution:** Verify your Render URL is correctly set in the frontend
```javascript
// Check this line in PaperBlackHoleGame.jsx
const serverUrl = 'https://your-actual-server-name.onrender.com'
```

### Issue: Socket.IO Connection Failed
**Solutions:**
1. Check server is running: Visit `/health` endpoint
2. Verify correct server URL
3. Check browser console for specific errors
4. Ensure both services are deployed

### Issue: Build Fails on Netlify
**Solutions:**
1. Check `package.json` has build script: `"build": "vite build"`
2. Verify all dependencies are installed
3. Check build logs for specific errors

### Issue: Room Code Not Working
**Solutions:**
1. Ensure both players are on the same deployed site
2. Check server logs for room creation/joining
3. Verify Socket.IO connection is established

## 📊 Monitoring

### Render (Backend)
- Automatic health checks
- Error logs in dashboard
- Metrics and usage stats

### Netlify (Frontend)
- Build logs
- Function logs
- Analytics and form submissions

## 🔄 CI/CD Pipeline

Both platforms offer automatic deployments:
- **Render:** Auto-deploys on push to main branch
- **Netlify:** Auto-deploys on push to main branch

## 💰 Costs (Free Tier)

### Render Free Tier
- 750 hours/month runtime
- 100GB bandwidth
- Sufficient for small multiplayer games

### Netlify Free Tier
- 100GB bandwidth/month
- 300 build minutes/month
- Perfect for static frontend

## 🎯 Next Steps

1. **Add Custom Domain**
   - Configure custom domains on both platforms
   - Update CORS settings if needed

2. **Add Analytics**
   - Google Analytics for frontend
   - Custom metrics for game usage

3. **Scale Up**
   - Monitor performance
   - Upgrade plans if needed

4. **Add Features**
   - Player authentication
   - Leaderboards
   - Game replays

## 🎮 Final Result

Your Black Hole game is now live with:
- **Backend:** `https://your-app-name.onrender.com`
- **Frontend:** `https://your-app-name.netlify.app`
- **Real-time multiplayer** via Socket.IO
- **Automatic deployments** on code changes
- **Free hosting** for development and small projects

Players can now enjoy your game from anywhere in the world! 🌍🎮
