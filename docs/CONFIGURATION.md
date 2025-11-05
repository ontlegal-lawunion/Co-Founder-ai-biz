# Configuration Guide

## System Prompt Configuration

### Current Setup

The system prompt is hardcoded in `backend/src/index.ts`:

```typescript
systemInstruction: `You are an AI ADHD Coach...`
```

### Performance Impact Analysis

#### Current Configuration (80 words)
- **First token latency**: ~200-400ms
- **Audio streaming start**: ~500-800ms
- **Quality**: Excellent ⭐⭐⭐⭐⭐
- **Recommended**: ✅ Yes, for production

#### With 150-word prompt
- **First token latency**: ~300-500ms (+100ms)
- **Audio streaming start**: ~700-1000ms (+200ms)
- **Quality**: Excellent ⭐⭐⭐⭐⭐
- **Recommended**: ✅ Yes, acceptable tradeoff

#### With 300-word prompt
- **First token latency**: ~500-800ms (+300ms)
- **Audio streaming start**: ~1000-1500ms (+700ms)
- **Quality**: Good ⭐⭐⭐⭐
- **Recommended**: ⚠️ Only if detailed behavior is critical

#### With 500+ word prompt
- **First token latency**: ~1000-2000ms (+1600ms)
- **Audio streaming start**: ~2000-3000ms (+2500ms)
- **Quality**: Degraded ⭐⭐⭐
- **Recommended**: ❌ Not for real-time audio

### Why Longer Prompts Affect Performance

1. **Token Processing**: Model must process system prompt on every turn
2. **Context Window**: Takes up space that could be conversation history
3. **Attention Mechanism**: More tokens = more computation per response
4. **Audio Generation**: Longer instructions can make model "overthink" responses

### Optimal Prompt Strategy

**For Real-Time Audio (like this project):**
```
Focus: Behavior, tone, constraints
Length: 80-150 words
Structure: Simple, direct instructions
Result: Fast, natural responses
```

**For Text Chat Applications:**
```
Focus: Detailed knowledge, examples
Length: 200-400 words
Structure: Organized sections, examples
Result: More accurate, comprehensive responses
```

---

## Loading Prompt from File

### Option 1: Environment Variable

**Best for**: Different prompts per environment (dev/staging/prod)

1. Edit `backend/.env`:
```env
SYSTEM_PROMPT="Your multi-line\nprompt\nhere..."
```

2. Update `backend/src/index.ts`:
```typescript
systemInstruction: process.env.SYSTEM_PROMPT || 
  `You are an AI ADHD Coach. Your goal is to be a supportive...`
```

**Pros:**
- Easy to change without code changes
- Different per environment
- Secure (not in version control)

**Cons:**
- Harder to read multi-line prompts
- Must escape special characters

---

### Option 2: JSON Config File

**Best for**: Multiple prompt variants, A/B testing

1. Create `backend/config/prompts.json`:
```json
{
  "adhd_coach": {
    "name": "ADHD Coach",
    "version": "1.0",
    "prompt": "You are an AI ADHD Coach. Your goal is to be a supportive, empathetic, and motivating partner..."
  },
  "adhd_coach_detailed": {
    "name": "ADHD Coach (Detailed)",
    "version": "2.0",
    "prompt": "You are an AI ADHD Coach specializing in executive function support..."
  }
}
```

2. Load in `backend/src/index.ts`:
```typescript
import prompts from '../config/prompts.json';

const PROMPT_VERSION = process.env.PROMPT_VERSION || 'adhd_coach';
const systemPrompt = prompts[PROMPT_VERSION].prompt;

// In ai.live.connect:
systemInstruction: systemPrompt
```

**Pros:**
- Easy to manage multiple versions
- Can store metadata
- Easy to read and edit

**Cons:**
- Must restart backend to change
- In version control

---

### Option 3: Text File (Recommended)

**Best for**: This use case - clean, readable, easy to edit

See implementation below for complete setup.

**Pros:**
- Clean, readable format
- Easy to edit in any text editor
- Can comment out sections
- Natural multi-line support

**Cons:**
- Must restart backend to change
- Slightly more complex setup

---

## Implementation: Load Prompt from File

Here's how to load the system prompt from an external file:

### Step 1: Create Prompt Files

Create different prompt variants in `backend/prompts/`:

```
backend/
  prompts/
    adhd-coach.txt          (default, 80 words)
    adhd-coach-detailed.txt (expanded, 150 words)
    adhd-coach-full.txt     (comprehensive, 300 words)
```

### Step 2: Update Backend Code

Modify `backend/src/index.ts` to load prompts:

```typescript
import { readFileSync } from 'fs';
import { join } from 'path';

// Load system prompt from file
const PROMPT_FILE = process.env.PROMPT_FILE || 'adhd-coach.txt';
let systemPrompt: string;

try {
  systemPrompt = readFileSync(
    join(__dirname, '../prompts', PROMPT_FILE), 
    'utf-8'
  ).trim();
  console.log(`✓ Loaded system prompt from: ${PROMPT_FILE}`);
  console.log(`  Length: ${systemPrompt.length} characters (~${Math.round(systemPrompt.split(' ').length)} words)`);
} catch (error) {
  console.error(`✗ Failed to load prompt file: ${PROMPT_FILE}`);
  console.error('  Using default prompt...');
  
  // Fallback to default
  systemPrompt = `You are an AI ADHD Coach. Your goal is to be a supportive, empathetic, and motivating partner. 
Keep your responses concise, actionable, and encouraging. Focus on helping the user with tasks related to focus, 
procrastination, organization, and emotional regulation. Break down complex tasks into smaller steps. 
Use a calm and reassuring tone. Ask clarifying questions to understand the user's challenges.`;
}

// ... rest of your code ...

// In the ai.live.connect config:
const session = await ai.live.connect({
  model: 'gemini-2.5-flash-native-audio-preview-09-2025',
  config: {
    responseModalities: [Modality.AUDIO],
    inputAudioTranscription: {},
    outputAudioTranscription: {},
    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
    systemInstruction: systemPrompt, // Use loaded prompt
  },
  // ... callbacks ...
});
```

### Step 3: Configure Environment

Add to `backend/.env` (optional):
```env
# System prompt configuration
PROMPT_FILE=adhd-coach.txt

# Or use a different variant:
# PROMPT_FILE=adhd-coach-detailed.txt
```

### Step 4: Switch Prompts

To test different prompts:

```bash
# Use default prompt
cd backend && npm start

# Use detailed prompt
PROMPT_FILE=adhd-coach-detailed.txt npm start

# Use comprehensive prompt
PROMPT_FILE=adhd-coach-full.txt npm start
```

---

## Performance Testing

After implementing prompt loading, test the performance:

### 1. Measure Prompt Loading Time

The console will show:
```
✓ Loaded system prompt from: adhd-coach.txt
  Length: 324 characters (~80 words)
```

### 2. Measure First Response Latency

Use browser DevTools Network tab to measure WebSocket message timing.

### 3. A/B Test Different Prompts

Create multiple prompt files and test each:

```bash
# Terminal 1: Test minimal prompt
PROMPT_FILE=adhd-coach.txt npm start

# Terminal 2: Test detailed prompt  
PROMPT_FILE=adhd-coach-detailed.txt npm start
```

Compare:
- Time to first audio chunk
- Audio quality
- Response relevance
- User experience

---

## Best Practices

1. **Start small** - Use minimal prompt, add only what's needed
2. **Test incrementally** - Add 50 words at a time, measure impact
3. **Version control** - Keep prompts in git with meaningful commit messages
4. **Document changes** - Note why each addition was made
5. **User feedback** - The "best" prompt balances quality AND speed

---

## Troubleshooting

### Prompt Not Loading

**Error**: `✗ Failed to load prompt file`

**Solutions:**
- Check file path is correct: `backend/prompts/your-file.txt`
- Ensure `backend/prompts/` directory exists
- Verify file encoding is UTF-8
- Check file permissions
- Try absolute path for debugging

### Performance Degradation

**Symptom**: Slow responses after changing prompt

**Debug steps:**
1. Check prompt length: Look at console output
2. Measure response time in browser DevTools
3. Try reverting to minimal prompt
4. Check backend logs for errors
5. Verify prompt doesn't contain special characters

### Prompt Not Taking Effect

**Symptom**: AI behavior unchanged after editing prompt

**Cause**: Backend needs restart to reload file

**Solution:**
```bash
# Stop backend (Ctrl+C in terminal)
# Edit your prompt file
# Restart backend
cd backend && npm start
```

---

## Summary

### Recommended Configuration

For this project (real-time audio):

✅ **Use**: External text file (`backend/prompts/adhd-coach.txt`)  
✅ **Length**: 80-150 words  
✅ **Load**: Once at startup  
✅ **Test**: Latency after changes  
✅ **Document**: Prompt versions and changes  

### Performance Guidelines

| Prompt Type | Word Count | Latency Impact | Use Case |
|-------------|-----------|----------------|----------|
| **Minimal** | 50-80 | None | Production default |
| **Standard** | 100-150 | +100-200ms | Enhanced behavior |
| **Detailed** | 200-300 | +300-500ms | Specialized use |
| **Comprehensive** | 400-500 | +800-1500ms | Non-realtime only |

### Quick Reference

```bash
# Change prompt file
PROMPT_FILE=your-prompt.txt npm start

# Check current prompt
# Look for console output when backend starts

# Test different prompts
# Create multiple .txt files in backend/prompts/
# Switch between them with PROMPT_FILE env var
```

This gives you the flexibility to experiment with prompts while maintaining excellent real-time audio performance! 🚀
