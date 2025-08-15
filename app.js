const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
const PORT = 3000;

// setup CORS
app.use(cors({
    origin: '*', // Allow all origins
    methods: 'GET,POST,PUT,DELETE,OPTIONS', // Allowed methods
    allowedHeaders: 'Content-Type,Authorization' // Allowed headers
}));

app.use(express.json());
// Mock Data
let users = [];
let contests = [];
let problems = [];
let submissions = [];

// Secret key for JWT
const SECRET_KEY = 'supersecretkey'; 

// --- Auth helpers ---
// --- Auth helpers ---
function getBearerToken(req) {
    // Node lower-cases header keys, but guard both just in case
    const h = req.headers.authorization || req.headers.Authorization;
    if (!h) return null;
  
    // Accept exactly "Bearer <token>" (tolerate extra spaces)
    const parts = h.split(' ').filter(Boolean);
    if (parts.length !== 2) return null;
  
    const [scheme, token] = parts;
    if (!/^Bearer$/i.test(scheme)) return null;
  
    return token.trim().replace(/^"|"$/g, ''); // strip accidental quotes
  }
  
  function authenticate(req, res, next) {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ message: 'No token provided' });
  
    try {
      const decoded = jwt.verify(token, SECRET_KEY); // must match the key used at login
      const id = decoded.sub ?? decoded.id ?? decoded.userId ?? null;
      req.auth = { id, username: decoded.username, ...decoded };
      req.user = req.auth; // b/c some routes use req.user
      return next();
    } catch (err) {
      console.error('JWT verification error:', err.name, err.message);
      const message = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
      return res.status(401).json({ message });
    }
  }
  
  // Accept raw token or "Bearer <token>"
  function getUsernameFromToken(authHeaderOrToken) {
    if (!authHeaderOrToken) return null;
    const token = String(authHeaderOrToken).startsWith('Bearer ')
      ? authHeaderOrToken.slice(7).trim()
      : String(authHeaderOrToken).trim();
  
    try {
      const { username } = jwt.verify(token.replace(/^"|"$/g, ''), SECRET_KEY);
      return username ?? null;
    } catch {
      return null;
    }
  }
  
  
  // ---------- Auth ----------
  app.post('/auth/register', (req, res) => {
    const { username, password, email, dateOfBirth, country, organization } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
  
    const existingUser = users.find(u => u.username === username);
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }
  
    const newUser = {
      id: users.length + 1,
      username,
      password, // NOTE: for production, hash this!
      email: email ?? null,
      dateOfBirth: dateOfBirth ?? null,
      country: country ?? null,
      organization: organization ?? null,
      rating: 1500
    };
  
    users.push(newUser);
  
    return res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        dateOfBirth: newUser.dateOfBirth,
        country: newUser.country,
        organization: newUser.organization,
        rating: newUser.rating
      }
    });
  });
  
  app.post('/auth/login', (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
  
    const user = users.find(u => u.username === username && u.password === password);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
  
    // Include both sub (id) and username in the JWT
    const token = jwt.sign({ sub: user.id, username: user.username }, SECRET_KEY, { expiresIn: '1h' });
    return res.json({ token, message: 'Login successful' });
  });
  

app.get('/auth/profile', authenticate, (req, res) => {
    const user = users.find(user => user.username === req.user.username);
    if (!user) {
        return res.status(404).send({ message: 'User not found' });
    }
    res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        dateOfBirth: user.dateOfBirth,
        country: user.country,
        organization: user.organization,
        rating: user.rating
    });
}
);
// ---------- User ----------
app.get('/users', (req, res) => {
    // Return a list of users with basic info
    // might have parameters to filter users

    const userList = users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        dateOfBirth: user.dateOfBirth,
        country: user.country,
        organization: user.organization,
        rating: user.rating
    }));

    // filter and sort users based on query parameters
    const { sortBy, order } = req.query;
    if (sortBy) {
        userList.sort((a, b) => {
            if (order === 'desc') {
                return b[sortBy] < a[sortBy] ? -1 : 1;
            }
            return a[sortBy] < b[sortBy] ? -1 : 1;
        });
    }
    res.send(userList);
});

app.get('/users/:id', (req, res) => {
    const user = users.find(user => user.id === parseInt(req.params.id));
    if (!user) {
        return res.status(404).send({ message: 'User not found' });
    }
    res.send({
        id: user.id,
        username: user.username,
        country: user.country,
        organization: user.organization,
        rating: user.rating
    });
});

// only a user can update their own profile
app.put('/users/:id', authenticate, (req, res) => {
    if (req.params.id != req.user.id) {
        return res.status(403).send({ message: 'You can only update your own profile' });
    }

    const user = users.find(user => user.id === parseInt(req.params.id));
    if (!user) {
        return res.status(404).send({ message: 'User not found' });
    }

    const { username, email, dateOfBirth, country, organization } = req.body;
    user.username = username || user.username;
    user.email = email || user.email;
    user.dateOfBirth = dateOfBirth || user.dateOfBirth;
    user.country = country || user.country;
    user.organization = organization || user.organization;

    res.send({ message: 'Profile updated successfully', user });
}
);

app.get('/users/:id/contests', (req, res) => {
    // practice all software engineering principles
    // check if user exists
    const user = users.find(user => user.id === parseInt(req.params.id));
    if (!user) {
        return res.status(404).send({ message: 'User not found' });
    }
    // return contests that the user has participated in
    const userContests = contests.filter(contest => contest.participants && contest.participants.includes(user.id));
    res.json({
        contests: userContests.map(contest => ({
            id: contest.id,
            name: contest.name,
            date: contest.date,
            duration: contest.duration,
            problems: contest.problems.length
        }))
    });
});

app.get('/users/:id/submissions', (req, res) => {
    // practice all software engineering principles
    // check if user exists
    const user = users.find(user => user.id === parseInt(req.params.id));
    if (!user) {
        return res.status(404).send({ message: 'User not found' });
    }
    // return submissions made by the user
    // remove the submissions from currently running contests
    const userSubmissions = submissions.filter(submission => submission.userId === user.id);
    res.json({
        submissions: userSubmissions.map(submission => ({
            id: submission.id,
            problemId: submission.problemId,
            contestId: submission.contestId,
            verdict: submission.verdict,
            timestamp: submission.timestamp
        }))
    });
});

app.get('/users/:id/rating', (req, res) => {
    // practice all software engineering principles
    // check if user exists
    const user = users.find(user => user.id === parseInt(req.params.id));
    if (!user) {
        return res.status(404).send({ message: 'User not found' });
    }
    // return user's rating
    res.json({
        id: user.id,
        username: user.username,
        rating: user.rating
    });
});

// ---------- Contest ----------
app.get('/contests', (req, res) => {
    // Return a list of contests with basic info
    // might have parameters to filter contests
    const contestList = contests.map(contest => ({
        id: contest.id,
        name: contest.name,
        date: contest.date,
        duration: contest.duration,
        problems: contest.problems.length
    }));

    // filter and sort contests based on query parameters
    const { sortBy, order } = req.query;
    if (sortBy) {
        contestList.sort((a, b) => {
            if (order === 'desc') {
                return b[sortBy] < a[sortBy] ? -1 : 1;
            }
            return a[sortBy] < b[sortBy] ? -1 : 1;
        });
    }
    res.send(contestList);
});

app.get('/contests/upcoming', (req, res) => {
    // Return a list of upcoming contests
    const now = new Date();
    console.log(`Current time: ${now}`);
    console.log(`Contests: ${JSON.stringify(contests, null, 2)}`);
    const upcomingContests = contests.filter(contest => {
        const contestDate = new Date(contest.dateTime);
        console.log(`Contest ${contest.id} date: ${contestDate}`);
        return contestDate > now;
    });
    res.send(upcomingContests.map(contest => ({
        id: contest.id,
        name: contest.name,
        date: contest.date,
        duration: contest.duration
    })));
});

app.get('/contests/:id', (req, res) => {
    const contestID = parseInt(req.params.id);
    const contest = contests.find(c => c.id === contestID);
    if (!contest) {
        return res.status(404).send({ message: 'Contest not found' });
    }
    
    if (new Date(contest.dateTime) > new Date()) {
        if(req.headers['authorization']) {
            const username = getUsernameFromToken(req.headers['authorization']);
            if(contest.setter === username) {
                return res.send({
                    id: contest.id,
                    name: contest.name,
                    date: contest.dateTime,
                    duration: contest.duration,
                    problems: contest.problems.length,
                    participants: contest.participants ? contest.participants.length : 0,
                    setter: contest.setter
                });
            }
        }
        return res.status(400).send({ message: 'Contest is upcoming or you are not authorized to see the details yet' });
    }

    res.send({
        id: contest.id,
        name: contest.name,
        date: contest.date,
        duration: contest.duration,
        problems: contest.problems.length,
        participants: contest.participants ? contest.participants.length : 0
    });
});

app.post('/contests', authenticate, (req, res) => {
    // get the username from the token and set as setter
    const setter = getUsernameFromToken(req.headers['authorization']);

    const { name, dateTime, duration } = req.body;
    if (!name || !dateTime || !duration) {
        return res.status(400).send({ message: 'Name, dateTime, and duration are required' });
    }

    const newContest = {
        id: contests.length + 1,
        name,
        dateTime,
        duration,
        problems: [],
        participants: [],
        setter
    };
    contests.push(newContest);
    res.status(201).json({
        message: 'Contest created successfully',
        contest: {
            id: newContest.id,
            name: newContest.name,
            date: newContest.dateTime,
            duration: newContest.duration,
            problems: newContest.problems.length,
            participants: newContest.participants.length,
            setter: newContest.setter
        }
    });
});


app.post('/contests/problems', authenticate, (req, res) => {
    const currentUser = getUsernameFromToken(req.headers['authorization']);
    const { contestId, problemName, problemDescription, problemInput, problemOutput, category, difficulty, timelimit } = req.body;
    const problemId = problems.length + 1; 
    if (!contestId || !problemId) {
        return res.status(400).send({ message: 'Contest ID and Problem ID are required' });
    }

    if (!problemName || !problemDescription || !problemInput || !problemOutput || !category || !difficulty || !timelimit) {
        return res.status(400).send({ message: 'Problem details(name, description, input, output, category, difficulty, timelimit) are required' });
    }


    const contest = contests.find(c => c.id === parseInt(contestId));
    if (!contest) {
        return res.status(404).send({ message: 'Contest not found' });
    }
    if (contest.setter !== currentUser) {
        return res.status(403).send({ message: 'You are not allowed to add problems to this contest' });
    }
    const newProblem = {
        id: problemId,
        name: problemName,
        description: problemDescription,
        input: problemInput,
        output: problemOutput,
        category,
        difficulty,
        timelimit, 
        contestId: contestId
    };
    problems.push(newProblem);
    res.status(201).json({
        message: 'Problem added to contest successfully',
        problem: newProblem
    });
});


app.get('/contests/:id/problems', (req, res) => {
    const contest = contests.find(contest => contest.id === parseInt(req.params.id));
    if (!contest) {
        return res.status(404).send({ message: 'Contest not found' });
    }
    // if contest is upcoming, return appropriate message
    if (new Date(contest.dateTime) > new Date()) {
        return res.status(400).send({ message: 'Contest is upcoming, problems are not available yet' });
    }
    const contestProblems = problems.filter(problem => problem.contestId === parseInt(req.params.id));
    res.send({
        contestId: contest.id,
        problems: contestProblems.map(problem => ({
            id: problem.id,
            name: problem.name,
            category: problem.category,
            timelimit: problem.timelimit
        }))
    });
});

app.get('/problems/:id', (req, res) => {
    const problem = problems.find(problem => problem.id === parseInt(req.params.id));
    if (!problem) {
        return res.status(404).send({ message: 'Problem not found' });
    }
    res.send({
        id: problem.id,
        name: problem.name,
        description: problem.description,
        input: problem.input,
        output: problem.output,
        category: problem.category,
        difficulty: problem.difficulty,
        timelimit: problem.timelimit
    });
});

app.get('/contests/:id/participants', (req, res) => {
    const contest = contests.find(contest => contest.id === parseInt(req.params.id));
    if (!contest) {
        return res.status(404).send({ message: 'Contest not found' });
    }
    // if contest is upcoming, return appropriate message
    if (new Date(contest.dateTime) > new Date()) {
        return res.status(400).send({ message: 'Contest is upcoming, participants are not available yet' });
    }
    const participants = contest.participants || [];
    res.send({
        contestId: contest.id,
        participants: participants.map(participant => ({
            id: participant,
            username: users.find(user => user.id === participant)?.username || 'Unknown'
        }))
    });
});

app.post('/contests/:id/join', authenticate, (req, res) => {
    const username = getUsernameFromToken(req.headers['authorization']);
    const contestID = parseInt(req.params.id);
    const userId = users.find(user => user.username === username)?.id;
    if (!userId) {
        return res.status(404).send({ message: 'User not found' });
    }
    const contest = contests.find(contest => contest.id === contestID);
    if (!contest) {
        return res.status(404).send({ message: 'Contest not found' });
    }
    // if setter is the same as user, return appropriate message
    if (contest.setter === username) {
        return res.status(400).send({ message: 'You cannot join your own contest' });
    }
    // if contest ended, return appropriate message
    if (new Date(contest.dateTime) < new Date()) {
        return res.status(400).send({ message: 'Contest has already ended' });
    }
    // if user already joined, return appropriate message
    if (contest.participants && contest.participants.includes(userId)) {
        return res.status(400).send({ message: 'You have already joined this contest' });
    }
    // add user to contest participants
    if (!contest.participants) {
        contest.participants = [];
    }
    contest.participants.push(userId);
    res.send({ message: `User ${username} joined contest ${contestID}`, contestId: contestID });
});

app.get('/contests/:id/leaderboard', (req, res) => {
    const contest = contests.find(contest => contest.id === parseInt(req.params.id));
    if (!contest) {
        return res.status(404).send({ message: 'Contest not found' });
    }
    // if contest is upcoming, return appropriate message
    // if (new Date(contest.dateTime) > new Date()) {
    //     return res.status(400).send({ message: 'Contest is upcoming, leaderboard is not available yet' });
    // }
    // mock leaderboard data
    const leaderboard = contest.participants ? contest.participants.map((participantId, index) => ({
        userId: participantId,
        username: users.find(user => user.id === participantId)?.username || 'Unknown',
        points: Math.floor(Math.random() * 100), // random points for demonstration
    })) : [];
    
    // if leaderboard has participants, sort by points
    if (leaderboard.length > 0) {
        leaderboard.sort((a, b) => b.points - a.points);
        leaderboard.forEach((user, index) => {
            user.rank = index + 1; // assign rank based on sorted order
        });
    }

    contest.leaderboard = leaderboard; // save leaderboard in contest object

    res.send({
        contestId: contest.id,
        leaderboard
    });
});

app.get('/contests/:id/participation/:userId', (req, res) => {
    const contest = contests.find(contest => contest.id === parseInt(req.params.id));
    if (!contest) {
        return res.status(404).send({ message: 'Contest not found' });
    }
    const userId = parseInt(req.params.userId);
    const user = users.find(user => user.id === userId);
    if (!user) {
        return res.status(404).send({ message: 'User not found' });
    }
    // check if user has participated in the contest
    const hasParticipated = contest.participants && contest.participants.includes(userId);
    if (!contest.leaderboard){
        res.status(400).send({ message: 'Contest leaderboard is not available yet' });
    }
    res.send({
        contestId: contest.id,
        userId: user.id,
        username: user.username,
        hasParticipated,
        leaderboard: contest.leaderboard ? contest.leaderboard.find(entry => entry.userId === userId) : null
    });
});

// ---------- Problem ----------
app.get('/problems', (req, res) => {
    const old_contests = contests.filter(contest => new Date(contest.dateTime) < new Date());
    const problemsList = []
    for(const contest of old_contests) {
        const contestProblems = problems.filter(problem => problem.contestId === contest.id);
        for(const problem of contestProblems) {
            problemsList.push({
                id: problem.id,
                name: problem.name,
                category: problem.category,
                difficulty: problem.difficulty,
                timelimit: problem.timelimit
            });
        }
    }
    // filter and sort problems based on query parameters
    const { sortBy, order } = req.query;
    if (sortBy) {
        problemsList.sort((a, b) => {
            if (order === 'desc') {
                return b[sortBy] < a[sortBy] ? -1 : 1;
            }
            return a[sortBy] < b[sortBy] ? -1 : 1;
        });
    }
    res.send(problemsList);
});

app.get('/problems/:id', (req, res) => {
    const problem = problems.find(problem => problem.id === parseInt(req.params.id));
    if (!problem) {
        return res.status(404).send({ message: 'Problem not found' });
    }
    res.send({
        id: problem.id,
        name: problem.name,
        description: problem.description,
        input: problem.input,
        output: problem.output,
        category: problem.category,
        difficulty: problem.difficulty,
        timelimit: problem.timelimit
    });
});

app.put('/problems/:id', (req, res) => {
    const problem = problems.find(problem => problem.id === parseInt(req.params.id));
    if (!problem) {
        return res.status(404).send({ message: 'Problem not found' });
    }

    const { name, description, input, output, category, difficulty, timelimit } = req.body;
    problem.name = name || problem.name;
    problem.description = description || problem.description;
    problem.input = input || problem.input;
    problem.output = output || problem.output;
    problem.category = category || problem.category;
    problem.difficulty = difficulty || problem.difficulty;
    problem.timelimit = timelimit || problem.timelimit;

    res.status(200).json({
        message: 'Problem updated successfully',
        problem: {
            id: problem.id,
            name: problem.name,
            description: problem.description,
            input: problem.input,
            output: problem.output,
            category: problem.category,
            difficulty: problem.difficulty,
            timelimit: problem.timelimit
        }
    });
});

app.get('/problems/:id/submissions', (req, res) => {
    const problem = problems.find(problem => problem.id === parseInt(req.params.id));
    if (!problem) {
        return res.status(404).send({ message: 'Problem not found' });
    }
    // return submissions made for the problem
    const problemSubmissions = submissions.filter(submission => submission.problemId === parseInt(req.params.id));
    res.send({
        problemId: problem.id,
        submissions: problemSubmissions.map(submission => ({
            id: submission.id,
            userId: submission.userId,
            contestId: submission.contestId,
            verdict: submission.verdict,
            timestamp: submission.timestamp
        }))
    });
});

// ---------- Submission ----------
app.post('/problems/:id/submit', (req, res) => {
    const problem = problems.find(problem => problem.id === parseInt(req.params.id));
    if (!problem) {
        return res.status(404).send({ message: 'Problem not found' });
    }

    const {problemId, code} = req.body;
    if (!problemId || !code) {
        return res.status(400).send({ message: 'Problem ID and code are required' });
    }
    const userId = getUsernameFromToken(req.headers['authorization']);
    if (!userId) {
        return res.status(401).send({ message: 'Unauthorized' });
    }
    const submissionId = submissions.length + 1; // Generate a new submission ID
    const contestId = problem.contestID;
    const contest = contests.find(c => c.id === contestId);
    
    // if contest is upcoming, return appropriate message
    if (contest && new Date(contest.dateTime) > new Date()) {
        return res.status(400).send({ message: 'Contest is upcoming, submissions are not allowed yet' });
    }

    // if user is not a participant in the contest and contest is not yet ended, return appropriate message
    if (contest && contest.participants && !contest.participants.includes(userId)) {
        return res.status(403).send({ message: 'You are not a participant in this contest' });
    }

    const newSubmission = {
        id: submissionId,
        problemId: parseInt(req.params.id),
        userId: userId,
        contestId: contestId,
        code: code,
        verdict: Math.random() > 0.5 ? 'Accepted' : 'Rejected', // Randomly assign verdict for demonstration
        runtime: Math.floor(Math.random() * 1000) + 'ms', // Random runtime for demonstration
        memory: Math.floor(Math.random() * 100) + 'KB', // Random memory usage for demonstration
        timestamp: new Date().toISOString()
    };

    submissions.push(newSubmission);
    res.status(201).json({
        message: 'Submission successful',
        submission: {
            id: newSubmission.id,
            problemId: newSubmission.problemId,
            userId: newSubmission.userId,
            contestId: newSubmission.contestId,
            verdict: newSubmission.verdict,
            runtime: newSubmission.runtime,
            memory: newSubmission.memory,
            timestamp: newSubmission.timestamp
        }
    });

});

app.get('/submissions', (req, res) => {
    // Return a list of submissions with basic info
    const submissionList = submissions.map(submission => ({
        id: submission.id,
        problemId: submission.problemId,
        userId: submission.userId,
        contestId: submission.contestId,
        verdict: submission.verdict,
        timestamp: submission.timestamp
    }));

    // filter and sort submissions based on query parameters
    const { sortBy, order } = req.query;
    if (sortBy) {
        submissionList.sort((a, b) => {
            if (order === 'desc') {
                return b[sortBy] < a[sortBy] ? -1 : 1;
            }
            return a[sortBy] < b[sortBy] ? -1 : 1;
        });
    }
    res.send(submissionList);
});

app.get('/submissions/:id', authenticate, (req, res) => {
    const submission = submissions.find(submission => submission.id === parseInt(req.params.id));
    if (!submission) {
        return res.status(404).send({ message: 'Submission not found' });
    }
    // check if user is authorized to view the submission
    const userId = getUsernameFromToken(req.headers['authorization']);
    if (submission.userId !== userId) {
        return res.status(403).send({ message: 'You are not authorized to view this submission' });
    }
    res.send({
        id: submission.id,
        problemId: submission.problemId,
        userId: submission.userId,
        contestId: submission.contestId,
        verdict: submission.verdict,
        runtime: submission.runtime,
        memory: submission.memory,
        timestamp: submission.timestamp
    });
});

// ---------- Start Server ----------

app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to the Mock Competitive Programming API'
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
