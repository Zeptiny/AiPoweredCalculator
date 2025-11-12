# Testing the Council Feature

## How to Test the Mathematical Council

### Prerequisites
1. Set up the `OPENROUTER_API_KEY` environment variable
2. Build and run the app: `npm run dev`

### Testing Steps

#### 1. Navigate to the App
- Open the app in your browser
- Enter a simple mathematical expression (e.g., "2+2")
- Click Calculate

#### 2. Create Disputes
- Click "Dispute This Answer"
- Enter feedback like "This is wrong, I think it should be 5"
- Submit the dispute
- Repeat 2 more times (you can dispute up to 3 times)

#### 3. Escalate to Supervisors
After 3 disputes, you'll automatically be prompted to escalate. Or you can manually escalate:
- Click "Call Senior Computation Specialist" (Level 1)
- Enter a concern and submit
- After Level 1 review, escalate to "Call Principal Mathematical Arbitrator" (Level 2)
- After Level 2 review, escalate to "Call Chief Executive of Mathematical Operations" (Level 3 - CEMO)

#### 4. Summon the Council
Once CEMO (Level 3) completes and marks the decision as FINAL:
- The "🏛️ SUMMON THE MATHEMATICAL COUNCIL" button will appear (animated pulse)
- Click the button
- You'll see 3 confirmation modals:
  1. **Modal 1**: Basic info about the council (~60-90 seconds runtime)
  2. **Modal 2**: Warning that process cannot be stopped once started
  3. **Modal 3**: Final confirmation with checkbox to acknowledge decision is final

#### 5. Watch the Council Session
The council session has 4 phases:

**Phase 1: Introduction** (~2 seconds)
- See the 5-6 randomly selected council members
- Each has a unique personality (Ancient Philosopher, Chaos Agent, Corporate Executive, etc.)

**Phase 2: Deliberation** (~35-50 seconds)
- Watch 3-5 rounds of debate
- Each agent speaks in their unique style
- Statements appear in cards with agent names

**Phase 3: Voting** (~8-10 seconds)
- Each agent casts their vote
- Votes appear in grid cards with reasoning

**Phase 4: Verdict** (~8-12 seconds)
- Chairperson announces the final verdict
- Official answer displayed prominently
- Final closing statement declaring decision as BINDING

#### 6. Easter Egg
- After the verdict, click "Appeal to Supreme Court?"
- See the humorous rejection message

### Expected Behavior

#### Council Button Visibility
The council button should only appear when:
- `supervisorLevel === 3` 
- `currentResult.supervisorReviews[2].isFinal === true`
- Council has not been summoned yet

#### Agent Personalities
You should see different personalities like:
- **Ancient Philosopher**: Uses archaic language, references historical mathematicians
- **Chaos Agent**: Absurd logic, random theories
- **Corporate Executive**: Buzzwords, synergy, KPIs
- **Skeptic**: Questions everything, demands proof
- **Radical Reformer**: Wants to overthrow traditional math
- **Procedural Stickler**: Obsessed with rules and bylaws
- **Mystic**: Numerology, cosmic significance
- **Practical Engineer**: Real-world, "good enough" approach

#### Streaming
- Deliberation statements should appear one at a time
- Votes should appear with 600ms delay between each
- No loading spinner - smooth streaming experience

### Troubleshooting

#### Button Doesn't Appear
- Verify you've completed all 3 supervisor levels
- Check that Level 3 (CEMO) has `isFinal: true`
- Look in browser console for any errors

#### Council Doesn't Start
- Check browser console for errors
- Verify `OPENROUTER_API_KEY` is set
- Check network tab for failed requests to `/api/council`

#### Streaming Issues
- Check that the API route is using Server-Sent Events (SSE)
- Verify Content-Type is `text/event-stream`
- Look for parsing errors in console

### Development Notes

#### API Endpoint
- Route: `/api/council`
- Method: POST
- Body: `{ expression, initialResult, disputes, supervisorReviews }`
- Response: Server-Sent Events (SSE) stream

#### Cost Estimate
- Each council session uses ~25-30 API calls
- ~5,500-6,000 tokens total
- Cost: $0.01-0.03 per session (using Llama models)

#### Timeout
- Default timeout: 2 minutes
- If timeout occurs, check for network issues or slow API responses
