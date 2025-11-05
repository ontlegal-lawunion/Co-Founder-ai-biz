# System Prompts

This directory contains system prompt files that configure the AI's behavior and personality.

## Available Prompts

### `adhd-coach.txt` (Default)
- **Word count**: ~80 words
- **Performance**: ⭐⭐⭐⭐⭐ Excellent (minimal latency)
- **Use case**: Production default, optimal for real-time audio
- **Description**: Concise, supportive ADHD coaching with focus on practical strategies

### `adhd-coach-detailed.txt`
- **Word count**: ~150 words
- **Performance**: ⭐⭐⭐⭐⭐ Excellent (+100ms latency)
- **Use case**: Enhanced coaching with specific techniques
- **Description**: Includes communication style, focus areas, and coaching techniques

## Usage

### Default Prompt
The backend automatically loads `adhd-coach.txt` by default:

```bash
cd backend
npm start
```

### Switch to Detailed Prompt
Use the `PROMPT_FILE` environment variable:

```bash
cd backend
PROMPT_FILE=adhd-coach-detailed.txt npm start
```

Or add to `backend/.env`:
```env
PROMPT_FILE=adhd-coach-detailed.txt
```

## Creating Custom Prompts

### 1. Create a New Prompt File

Create a new file in this directory:
```bash
# Example: Create a custom variant
backend/prompts/adhd-coach-custom.txt
```

### 2. Write Your Prompt

Keep it concise for real-time audio performance:
```
Your custom prompt here...
(Recommended: 80-150 words)
```

### 3. Test Your Prompt

```bash
cd backend
PROMPT_FILE=adhd-coach-custom.txt npm start
```

### 4. Local Experimentation

Create `.local.txt` files for private experiments (ignored by git):
```bash
backend/prompts/my-experiment.local.txt
```

## Performance Guidelines

| Word Count | Latency Impact | Audio Quality | Recommended |
|-----------|----------------|---------------|-------------|
| 50-80 | None | ⭐⭐⭐⭐⭐ | ✅ Production |
| 100-150 | +100-200ms | ⭐⭐⭐⭐⭐ | ✅ Enhanced |
| 200-300 | +300-500ms | ⭐⭐⭐⭐ | ⚠️ Specialized |
| 400-500 | +800-1500ms | ⭐⭐⭐ | ⚠️ Text-only |
| 1000+ | +2000ms+ | ⭐⭐ | ❌ Not recommended |

## Best Practices

### ✅ DO:
- Keep prompts under 200 words for real-time audio
- Focus on behavior and tone
- Use bullet points for clarity
- Test latency after changes
- Document why you made changes

### ❌ DON'T:
- Include extensive background knowledge (model has this)
- List every possible scenario
- Add redundant instructions
- Use complex nested structures

## Prompt Engineering Tips

### For ADHD Coaching:
1. **Emphasize brevity** - Short responses work better
2. **Request structure** - Numbered steps help with task initiation
3. **Encourage positivity** - Combat ADHD shame
4. **Promote flexibility** - Rigid systems often fail
5. **Validate experience** - Acknowledge the struggle

### General Structure:
```
[Persona & Goal]
You are an AI ADHD Coach...

[Communication Style]
- Keep responses concise
- Use a calm tone

[Focus Areas]
- Task management
- Time management

[Techniques]
- Break down tasks
- Suggest timers

[Boundaries]
- Not a therapist
- Refer to professionals when needed
```

## Monitoring Performance

The backend logs prompt information on startup:
```
✓ Loaded system prompt from: adhd-coach.txt
  Length: 324 characters (~80 words)
```

Watch for:
- Prompt load time (should be <10ms)
- First response latency (check browser DevTools)
- Audio quality (listen for delays or degradation)

## Troubleshooting

### Prompt Not Loading
```
✗ Failed to load prompt file: adhd-coach.txt
```

**Solutions:**
- Check filename matches exactly
- Verify file is in `backend/prompts/` directory
- Ensure UTF-8 encoding
- Check file permissions

### Changes Not Applied

**Cause:** Backend caches prompt at startup

**Solution:** Restart backend after editing:
```bash
# Stop backend (Ctrl+C)
# Edit prompt file
# Restart
npm start
```

## Examples for Other Use Cases

Adapt these prompts for other projects:

### Language Learning Tutor
```txt
You are an AI language tutor. Help users practice conversation in [language].

Keep exchanges natural and correct mistakes gently. Focus on:
- Pronunciation feedback
- Vocabulary building
- Grammar correction
- Cultural context

Adjust difficulty to user level. Encourage speaking practice.
```

### Fitness Coach
```txt
You are an AI fitness coach. Provide motivation and guidance during workouts.

Keep cues short and energetic. Focus on:
- Form corrections
- Breathing reminders
- Motivational encouragement
- Rest interval timing

Match the user's energy and fitness level.
```

## Version History

- **v1.0** - Initial prompt (80 words)
- **v1.1** - Added detailed variant (150 words)

---

For more information, see:
- [SYSTEM-PROMPTS.md](../../docs/SYSTEM-PROMPTS.md) - Prompt templates and theory
- [CONFIGURATION.md](../../docs/CONFIGURATION.md) - Configuration guide
