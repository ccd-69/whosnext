const { io } = require('socket.io-client');
const URL = 'http://localhost:3000';

function connect() {
  return new Promise((resolve) => {
    const socket = io(URL, { transports: ['websocket'] });
    socket.on('connect', () => resolve(socket));
  });
}

function doAuth(socket, username, password) {
  return new Promise((resolve) => {
    socket.emit('register', username, password, '', (success, msg, user) => {
      if (success) return resolve({ user });
      socket.emit('login', username, password, (success2, msg2, user2) => {
        resolve({ user: user2 });
      });
    });
  });
}

(async () => {
  const s1 = await connect();
  const { user: u1 } = await doAuth(s1, 'demouser1', 'demopass');
  console.log('User1:', u1?.username, 'id=', u1?.id);

  const s2 = await connect();
  const { user: u2 } = await doAuth(s2, 'demouser2', 'demopass');
  console.log('User2:', u2?.username, 'id=', u2?.id);

  s1.emit('create-group', 'Party People', (group) => {
    console.log('GROUP_ID=' + group?.id);
    s1.disconnect();
    s2.disconnect();
    process.exit(0);
  });
})();
