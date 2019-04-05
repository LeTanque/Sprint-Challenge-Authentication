const axios = require('axios');
const bcrypt = require('bcryptjs');
const db = require('../database/dbConfig');
const jwt = require('jsonwebtoken');
const jwtSecret = process.env.JWT_SECRET || 'add a .env file to root of project with the JWT_SECRET variable';
 

const { authenticate } = require('../auth/authenticate');

module.exports = server => {
  server.post('/api/register', register);
  server.post('/api/login', login);
  server.get('/api/jokes', authenticate, getJokes);
};

const errors = { // J.Pinkman Dynamic error messaging based on sqlite codes 
  '1': 'We ran into an error, yo! I dunno!',
  '4': 'Operation aborted, yo!',
  '9': 'Operation aborted, yo!',
  '19': 'Another record with that value exists, yo!'
};


// POST route to /api/register
async function register (req, res) {
  if (!req.body.username || !req.body.password) { 
      return res.status(400).json({ message:"Please include a name and password to create a new user" 
  })}
  let user = req.body;
  const hash = bcrypt.hashSync(user.password, 10); 
  user.password = hash;

  try {
    const [id] = await db('users').insert(user);
    user = await db('users')
      .where({ id })
      .first();
    res.status(201).json({ 
      message:`Thank you for registering ${user.username}`, 
      username:user.username,
      id:user.id
    });  
  } catch (error) {
    const message = errors[error.errno] || "We ran into an error, yo";
    res.status(500).json({ message:message, error:error });
  }
};


// POST route to /api/login
async function login(req, res) {
  if (!req.body.username || !req.body.password) {
    return res.status(400).json({ message:"Username and password required" })
  }
  let { username, password } = req.body;
  const userExists = await db('users').where({ username })

  if (userExists && bcrypt.compareSync(password, userExists[0].password)) {
    const token = generateToken(userExists[0]);
    // console.log(token)
    return res.status(200).json({
      message: `Welcome ${req.body.username}!`,
      token,
    });
  } else {
    return res.status(401).json({ message:"You shall not pass!" });
  }
}


function generateToken(user) {
  const payload = {
      username: user.username
  };
  const options = {
      expiresIn: '1d',
  };
  return jwt.sign(payload, jwtSecret, options);
}


// GET route to /api/jokes
function getJokes(req, res) {
  const requestOptions = { headers: { accept: 'application/json' }}

  axios
    .get('https://icanhazdadjoke.com/search', requestOptions)
    .then(response => {
      return res.status(200).json(response.data.results);
    })
    .catch(error => {
      setTimeout(function () {
        try {
          return res.status(500).json({ message:"Error Fetching Jokes", error: error });
        } catch (error) {
          return res.status(500).json({ message:"Timeout" })
        }
      }, 1000)
    });
}
