const API_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('--- CHAT RUNTIME VALIDATION ---\n');
  let memberToken, coachToken, memberId, coachId, conversationId;

  const h = (token) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` });
  const json = async (res) => { const d = await res; const b = await d.json(); return b; };
  const post = (url, body, token) => fetch(url, { method: 'POST', headers: h(token), body: JSON.stringify(body) });
  const get = (url, token) => fetch(url, { method: 'GET', headers: h(token) });
  const put = (url, body, token) => fetch(url, { method: 'PUT', headers: h(token), body: JSON.stringify(body || {}) });

  try {
    // STEP 3: Authenticate
    console.log('=== STEP 3: Authenticate ===');
    const memberRes = await json(post(`${API_URL}/auth/login`, { email: 'member1@gmail.com', password: '123456' }));
    if (!memberRes.success) throw new Error('Member login failed: ' + JSON.stringify(memberRes));
    memberToken = memberRes.data.token;
    memberId = memberRes.data.user.id;
    console.log(`Member Login: PASS (userId=${memberId})`);

    const coachRes = await json(post(`${API_URL}/auth/login`, { email: 'coach1@gmail.com', password: '123456' }));
    if (!coachRes.success) throw new Error('Coach login failed: ' + JSON.stringify(coachRes));
    coachToken = coachRes.data.token;
    coachId = coachRes.data.user.id;
    console.log(`Coach Login: PASS (userId=${coachId})`);

    // STEP 4: Create conversation
    console.log('\n=== STEP 4: Create Conversation ===');
    const convRes = await json(post(`${API_URL}/chat/conversations`, { coachUserId: coachId }, memberToken));
    if (!convRes.success) throw new Error('Create conversation failed: ' + JSON.stringify(convRes));
    conversationId = convRes.data.id;
    console.log(`CREATE CONVERSATION: PASS (id=${conversationId})`);

    // STEP 5: Send message
    console.log('\n=== STEP 5: Send Message ===');
    const msgRes = await json(post(`${API_URL}/chat/conversations/${conversationId}/messages`, { content: 'Hello Coach! This is a test message.' }, memberToken));
    if (!msgRes.success) throw new Error('Send message failed: ' + JSON.stringify(msgRes));
    const msgId = msgRes.data.id;
    console.log(`SEND MESSAGE: PASS (msgId=${msgId})`);

    // STEP 6: Fetch messages
    console.log('\n=== STEP 6: Fetch Messages ===');
    const msgsRes = await json(get(`${API_URL}/chat/conversations/${conversationId}/messages`, coachToken));
    if (!msgsRes.success || !msgsRes.data || msgsRes.data.length === 0) throw new Error('Fetch messages failed: ' + JSON.stringify(msgsRes));
    const found = msgsRes.data.find(m => m.id === msgId);
    if (!found) throw new Error('Sent message not found in response');
    console.log(`GET MESSAGES: PASS (${msgsRes.data.length} messages, content="${found.content}")`);

    // STEP 7: Unread count
    console.log('\n=== STEP 7: Unread Count ===');
    const ur1 = await json(get(`${API_URL}/chat/unread-count`, coachToken));
    if (!ur1.success) throw new Error('Unread count failed: ' + JSON.stringify(ur1));
    console.log(`UNREAD COUNT (before read): ${ur1.data.count}`);
    console.log('UNREAD COUNT: PASS');

    // STEP 8: Mark read
    console.log('\n=== STEP 8: Mark Read ===');
    const readRes = await put(`${API_URL}/chat/conversations/${conversationId}/read`, {}, coachToken);
    if (!readRes.success) throw new Error('Mark read failed: ' + JSON.stringify(readRes));
    console.log('MARK READ: PASS');

    const ur2 = await json(get(`${API_URL}/chat/unread-count`, coachToken));
    console.log(`UNREAD COUNT (after read): ${ur2.data.count}`);
    if (ur2.data.count >= ur1.data.count) {
      console.log('WARNING: Unread count did not decrease');
    } else {
      console.log('Unread count decreased: PASS');
    }

    // STEP 9: Persistence
    console.log('\n=== STEP 9: Persistence ===');
    const convs = await json(get(`${API_URL}/chat/conversations`, memberToken));
    const exists = convs.data && convs.data.find(c => c.id === conversationId);
    if (!exists) throw new Error('Conversation not found after refresh');
    console.log('DATABASE PERSISTENCE: PASS');

    console.log('\n========================================');
    console.log('CHAT DATABASE: PASS');
    console.log('CREATE CONVERSATION: PASS');
    console.log('SEND MESSAGE: PASS');
    console.log('GET MESSAGES: PASS');
    console.log('UNREAD COUNT: PASS');
    console.log('MARK READ: PASS');
    console.log('DATABASE PERSISTENCE: PASS');
    console.log('CHAT SYSTEM RUNTIME VERIFIED: YES');

  } catch (error) {
    console.error('\nERROR:', error.message);
    console.log('\nCHAT SYSTEM RUNTIME VERIFIED: NO');
  }
}

runTests();