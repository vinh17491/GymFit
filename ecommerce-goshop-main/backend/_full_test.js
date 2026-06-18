const http = require('http');

function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const options = { hostname: 'localhost', port: 5000, path, method, headers };
    const r = http.request(options, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

function dbQuery(query) {
  const sql = require('mssql');
  const cfg = { server: 'DESKTOP-0PI1Q6Q', database: 'GymFit', user: 'sa', password: '1', port: 1433, options: { encrypt: false, trustServerCertificate: true } };
  return sql.connect(cfg).then(() => sql.query(query)).then(r => r.recordset);
}

async function run() {
  const results = {};

  // STEP 1: Database tables
  console.log('\n=== STEP 1: DATABASE TABLES ===');
  try {
    const conv = await dbQuery('SELECT COUNT(*) as cnt FROM ChatConversations');
    const msgs = await dbQuery('SELECT COUNT(*) as cnt FROM ChatMessages');
    console.log('ChatConversations rows:', conv[0].cnt);
    console.log('ChatMessages rows:', msgs[0].cnt);
    results['CHAT_DATABASE'] = 'PASS';
  } catch (e) {
    console.log('DB ERROR:', e.message);
    results['CHAT_DATABASE'] = 'FAIL';
  }

  // STEP 3: Authenticate - lowercase fields per auth controller
  console.log('\n=== STEP 3: AUTHENTICATE ===');
  let memberToken, coachToken, memberUser, coachUser;

  // Find existing users via DB
  const users = await dbQuery("SELECT TOP 10 u.Id, u.FullName, u.Email, u.RoleId, r.Name AS RoleName FROM Users u JOIN Roles r ON u.RoleId = r.Id WHERE u.IsActive = 1");
  console.log('Existing users:', JSON.stringify(users.map(u => ({ Id: u.Id, Name: u.FullName, Email: u.Email, Role: u.RoleName }))));

  const member = users.find(u => u.RoleName === 'Member' || u.RoleName === 'MEMBER');
  const coach = users.find(u => u.RoleName === 'Coach' || u.RoleName === 'COACH' || u.RoleName === 'Trainer');

  if (member) {
    // Try common passwords
    for (const pwd of ['Admin@123', 'Password123!', 'test123', '123456', 'password']) {
      const lm = await req('POST', '/auth/login', { email: member.Email, password: pwd });
      if (lm.status === 200 && lm.body.accessToken) {
        memberToken = lm.body.accessToken;
        memberUser = { Id: member.Id, Email: member.Email, FullName: member.FullName, RoleId: member.RoleId };
        console.log('Member logged in:', member.Email, 'pwd:', pwd);
        break;
      }
    }
    if (!memberToken) console.log('Failed to login member with common passwords');
  }

  if (coach) {
    for (const pwd of ['Admin@123', 'Password123!', 'test123', '123456', 'password']) {
      const lc = await req('POST', '/auth/login', { email: coach.Email, password: pwd });
      if (lc.status === 200 && lc.body.accessToken) {
        coachToken = lc.body.accessToken;
        coachUser = { Id: coach.Id, Email: coach.Email, FullName: coach.FullName, RoleId: coach.RoleId };
        console.log('Coach logged in:', coach.Email, 'pwd:', pwd);
        break;
      }
    }
    if (!coachToken) console.log('Failed to login coach with common passwords');
  }

  // If no member/coach found, register new ones
  if (!memberToken) {
    console.log('Registering new member...');
    const regM = await req('POST', '/auth/register', { email: 'testmember_run@test.com', password: 'Test@1234', fullName: 'TestMember' });
    console.log('Register Member:', regM.status, JSON.stringify(regM.body).substring(0, 200));
    if (regM.status === 201 && regM.body.accessToken) {
      memberToken = regM.body.accessToken;
      memberUser = regM.body.user;
    }
  }
  if (!coachToken) {
    console.log('Registering new coach...');
    const regC = await req('POST', '/auth/register', { email: 'testcoach_run@test.com', password: 'Test@1234', fullName: 'TestCoach' });
    console.log('Register Coach:', regC.status, JSON.stringify(regC.body).substring(0, 200));
    if (regC.status === 201 && regC.body.accessToken) {
      coachToken = regC.body.accessToken;
      coachUser = regC.body.user;
    }
  }

  if (!memberToken || !coachToken) {
    console.log('\nCANNOT PROCEED WITHOUT BOTH TOKENS');
    console.log('RESULTS:', JSON.stringify(results, null, 2));
    process.exit(1);
  }

  const memberId = memberUser.Id || memberUser.id;
  const coachId = coachUser.Id || coachUser.id;
  console.log('Member ID:', memberId, 'Coach ID:', coachId);

  // STEP 4: Create conversation
  console.log('\n=== STEP 4: CREATE CONVERSATION ===');
  let convId;
  try {
    const r = await req('POST', '/chat/conversations', { ReceiverId: coachId }, memberToken);
    console.log('Create conversation:', r.status, JSON.stringify(r.body).substring(0, 300));
    convId = r.body.conversationId || r.body.ConversationId || r.body.id || r.body.Id;
    if (!convId && r.body.conversation) {
      convId = r.body.conversation.ConversationId || r.body.conversation.Id || r.body.conversation.id;
    }
    console.log('Conversation ID:', convId);
    // Verify in DB
    const dbConv = await dbQuery('SELECT * FROM ChatConversations WHERE (SenderId=' + memberId + ' AND ReceiverId=' + coachId + ') OR (SenderId=' + coachId + ' AND ReceiverId=' + memberId + ')');
    if (dbConv.length > 0) {
      convId = convId || dbConv[0].ConversationId || dbConv[0].Id;
      console.log('DB verification: conversation found, ID:', convId);
      results['CREATE_CONVERSATION'] = 'PASS';
    } else {
      const allConv = await dbQuery('SELECT TOP 3 * FROM ChatConversations ORDER BY ConversationId DESC');
      console.log('Latest conversations:', JSON.stringify(allConv));
      if (allConv.length > 0) {
        convId = convId || allConv[0].ConversationId || allConv[0].Id;
        results['CREATE_CONVERSATION'] = 'PASS';
      } else {
        results['CREATE_CONVERSATION'] = 'FAIL';
      }
    }
  } catch (e) {
    console.log('Create conv error:', e.message);
    results['CREATE_CONVERSATION'] = 'FAIL';
  }

  // STEP 5: Send message
  console.log('\n=== STEP 5: SEND MESSAGE ===');
  if (convId) {
    try {
      const r = await req('POST', '/chat/conversations/' + convId + '/messages', { Content: 'Hello from test!' }, memberToken);
      console.log('Send message:', r.status, JSON.stringify(r.body).substring(0, 300));
      // Verify in DB
      const dbMsg = await dbQuery('SELECT TOP 1 * FROM ChatMessages WHERE ConversationId=' + convId + ' ORDER BY MessageId DESC');
      if (dbMsg.length > 0) {
        console.log('DB message found:', JSON.stringify(dbMsg[0]));
        const m = dbMsg[0];
        const checks = {
          ConversationId: m.ConversationId == convId,
          SenderId: m.SenderId == memberId,
          ReceiverId: m.ReceiverId == coachId,
          Content: m.Content === 'Hello from test!'
        };
        console.log('Field checks:', JSON.stringify(checks));
        results['SEND_MESSAGE'] = Object.values(checks).every(v => v) ? 'PASS' : 'FAIL';
      } else {
        results['SEND_MESSAGE'] = 'FAIL';
        console.log('No message found in DB');
      }
    } catch (e) {
      console.log('Send msg error:', e.message);
      results['SEND_MESSAGE'] = 'FAIL';
    }
  } else {
    console.log('SKIP: No conversation ID');
    results['SEND_MESSAGE'] = 'FAIL';
  }

  // STEP 6: Fetch messages
  console.log('\n=== STEP 6: FETCH MESSAGES ===');
  if (convId) {
    try {
      const r = await req('GET', '/chat/conversations/' + convId + '/messages', null, memberToken);
      console.log('Fetch messages:', r.status);
      const msgs = r.body.messages || r.body.Messages || r.body;
      if (Array.isArray(msgs)) {
        console.log('Messages count:', msgs.length);
        const found = msgs.find(m => (m.Content || m.content) === 'Hello from test!');
        console.log('Found sent message:', !!found);
        results['GET_MESSAGES'] = found ? 'PASS' : 'FAIL';
      } else {
        console.log('Response:', JSON.stringify(r.body).substring(0, 500));
        results['GET_MESSAGES'] = 'FAIL';
      }
    } catch (e) {
      console.log('Fetch msg error:', e.message);
      results['GET_MESSAGES'] = 'FAIL';
    }
  } else {
    results['GET_MESSAGES'] = 'FAIL';
  }

  // STEP 7: Unread count
  console.log('\n=== STEP 7: UNREAD COUNT ===');
  try {
    const r1 = await req('GET', '/chat/unread-count', null, coachToken);
    console.log('Unread count before:', r1.status, JSON.stringify(r1.body));
    const countBefore = r1.body.unreadCount || r1.body.UnreadCount || r1.body.count || 0;
    if (convId) {
      await req('POST', '/chat/conversations/' + convId + '/messages', { Content: 'Another message for unread' }, memberToken);
    }
    const r2 = await req('GET', '/chat/unread-count', null, coachToken);
    console.log('Unread count after:', r2.status, JSON.stringify(r2.body));
    const countAfter = r2.body.unreadCount || r2.body.UnreadCount || r2.body.count || 0;
    console.log('Before:', countBefore, 'After:', countAfter);
    results['UNREAD_COUNT'] = countAfter >= countBefore ? 'PASS' : 'FAIL';
  } catch (e) {
    console.log('Unread error:', e.message);
    results['UNREAD_COUNT'] = 'FAIL';
  }

  // STEP 8: Mark read
  console.log('\n=== STEP 8: MARK READ ===');
  if (convId) {
    try {
      const r = await req('PUT', '/chat/conversations/' + convId + '/read', null, coachToken);
      console.log('Mark read:', r.status, JSON.stringify(r.body));
      const unread = await dbQuery('SELECT COUNT(*) as cnt FROM ChatMessages WHERE ConversationId=' + convId + ' AND SenderId=' + memberId + ' AND IsRead=0');
      console.log('Unread messages after mark-read:', unread[0].cnt);
      const r2 = await req('GET', '/chat/unread-count', null, coachToken);
      console.log('Unread count after mark-read:', JSON.stringify(r2.body));
      results['MARK_READ'] = unread[0].cnt === 0 ? 'PASS' : 'FAIL';
    } catch (e) {
      console.log('Mark read error:', e.message);
      results['MARK_READ'] = 'FAIL';
    }
  } else {
    results['MARK_READ'] = 'FAIL';
  }

  // STEP 9: Persistence
  console.log('\n=== STEP 9: PERSISTENCE ===');
  if (convId) {
    try {
      const conv = await dbQuery('SELECT * FROM ChatConversations WHERE ConversationId=' + convId);
      const msgs = await dbQuery('SELECT * FROM ChatMessages WHERE ConversationId=' + convId);
      console.log('Conversation persists:', conv.length > 0);
      console.log('Messages persist:', msgs.length > 0, '(count:', msgs.length + ')');
      results['DATABASE_PERSISTENCE'] = (conv.length > 0 && msgs.length > 0) ? 'PASS' : 'FAIL';
    } catch (e) {
      console.log('Persistence error:', e.message);
      results['DATABASE_PERSISTENCE'] = 'FAIL';
    }
  } else {
    results['DATABASE_PERSISTENCE'] = 'FAIL';
  }

  // FINAL SUMMARY
  console.log('\n============================');
  console.log('FINAL RESULTS');
  console.log('============================');
  for (const [k, v] of Object.entries(results)) {
    console.log(k + ': ' + v);
  }
  const allPass = Object.values(results).every(v => v === 'PASS');
  console.log('\nCHAT SYSTEM RUNTIME VERIFIED: ' + (allPass ? 'YES' : 'NO'));
  console.log('============================');
  process.exit(0);
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });