# Audio Notes Testing Plan

## Test Environment Setup
- Frontend: Next.js development server (npm run dev)
- Backend: Firebase Cloud Functions (needs to be deployed)
- Database: Firestore
- Storage: Firebase Storage

## Test Cases

### 1. Audio Recording Functionality
- [ ] **Test 1.1**: Record new audio note
  - Navigate to Stored Documents
  - Click "Note" button on a document without audio
  - Hold to record audio
  - Release to stop recording
  - Verify single save confirmation appears
  - Verify audio controls appear after save

- [ ] **Test 1.2**: Recording timeout
  - Start recording and hold for 30+ seconds
  - Verify recording stops automatically
  - Verify timeout message appears

- [ ] **Test 1.3**: Microphone permission
  - Block microphone access
  - Try to record audio
  - Verify permission error message appears

### 2. Audio Playback Functionality
- [ ] **Test 2.1**: Play existing audio note
  - Navigate to document with existing audio note
  - Click play button
  - Verify audio plays
  - Verify slider tracks progress

- [ ] **Test 2.2**: Pause audio
  - Start playing audio
  - Click pause button
  - Verify audio pauses
  - Verify slider stops updating

- [ ] **Test 2.3**: Seek functionality
  - Start playing audio
  - Drag slider to different position
  - Verify audio jumps to new position
  - Verify playback continues from new position

- [ ] **Test 2.4**: Audio ends naturally
  - Play audio to end
  - Verify play button resets
  - Verify slider resets to beginning

### 3. Audio Persistence
- [ ] **Test 3.1**: Page refresh with existing audio
  - Record audio note on document
  - Refresh page
  - Verify audio controls still appear
  - Verify audio can be played

- [ ] **Test 3.2**: Multiple documents with audio
  - Record audio on multiple documents
  - Refresh page
  - Verify all audio notes persist
  - Verify each can be played independently

### 4. Audio Replacement
- [ ] **Test 4.1**: Replace existing audio
  - Document has existing audio note
  - Record new audio note
  - Verify old audio is replaced
  - Verify only one audio note exists

- [ ] **Test 4.2**: No double saves
  - Record audio note
  - Verify only one save confirmation appears
  - Verify no duplicate audio controls

### 5. Audio Deletion
- [ ] **Test 5.1**: Delete audio note
  - Document has existing audio note
  - Click trash button
  - Verify audio controls disappear
  - Verify "Note" button reappears

- [ ] **Test 5.2**: Delete during playback
  - Start playing audio
  - Click delete button
  - Verify audio stops
  - Verify controls reset

### 6. Error Handling
- [ ] **Test 6.1**: Network error during save
  - Disconnect internet
  - Try to record audio
  - Verify error message appears
  - Verify UI resets properly

- [ ] **Test 6.2**: Audio loading error
  - Corrupt audio file
  - Try to play audio
  - Verify error handling
  - Verify UI doesn't freeze

### 7. UI State Management
- [ ] **Test 7.1**: Recording state
  - Start recording
  - Verify button shows "Rec..." with radio icon
  - Verify other buttons are disabled
  - Stop recording
  - Verify button resets

- [ ] **Test 7.2**: Upload state
  - Record audio
  - Verify loading spinner appears during upload
  - Verify controls are disabled during upload
  - Verify state resets after upload

### 8. Cross-browser Testing
- [ ] **Test 8.1**: Chrome
- [ ] **Test 8.2**: Firefox
- [ ] **Test 8.3**: Safari
- [ ] **Test 8.4**: Edge

### 9. Mobile Testing
- [ ] **Test 9.1**: Touch recording
  - Use touch events on mobile
  - Verify recording starts/stops properly
  - Verify UI responds correctly

- [ ] **Test 9.2**: Mobile playback
  - Test audio playback on mobile
  - Verify controls work with touch

## Issues Found During Testing

### Critical Issues
- [ ] 

### Minor Issues
- [ ] 

### Performance Issues
- [ ] 

## Test Results Summary
- Total Tests: 25+
- Passed: 
- Failed: 
- Skipped: 

## Recommendations
- [ ] 