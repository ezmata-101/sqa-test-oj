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

// Middleware to simulate authentication
function authenticate(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).send({ message: 'No token provided' });

    const token = authHeader.split(' ')[1];
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).send({ message: 'Invalid token' });
        req.user = user;
        next();
    });
}

function getUsernameFromToken(token) {
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        return decoded.username;
    } catch (err) {
        return null;
    }
}

// ---------- Auth ----------
app.post('/auth/register', (req, res) => {
    const { username, password, email, dateOfBirth, country, organization } = req.body;
    if (!username || !password) {
        return res.status(400).send({ message: 'Username and password are required' });
    }

    const existingUser = users.find(user => user.username === username);
    if (existingUser) {
        return res.status(400).send({ message: 'Username already exists' });
    }

    const newUser = {
        id: users.length + 1,
        username,
        password,
        email,
        dateOfBirth,
        country,
        organization,
        rating: 1500
    };

    users.push(newUser);

    res.status(201).json({
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
    // practice all software engineering principles
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).send({ message: 'Username and password are required' });
    }
    const user = users.find(user => user.username === username && user.password === password);
    if (!user) {
        return res.status(401).send({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ username: user.username }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ token, message: 'Login successful' });
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
    const upcomingContests = contests.filter(contest => new Date(contest.date) > now);
    res.send(upcomingContests.map(contest => ({
        id: contest.id,
        name: contest.name,
        date: contest.date,
        duration: contest.duration
    })));
});

app.get('/contests/:id', (req, res) => {
    const contest = contests.find(contest => contest.id === parseInt(req.params.id));
    if (!contest) {
        return res.status(404).send({ message: 'Contest not found' });
    }
    // remove the upcoming contests from the list
    const contests = contests.filter(c => new Date(c.date) <= new Date());
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

    const { name, date, duration, problems } = req.body;
    if (!name || !date || !duration) {
        return res.status(400).send({ message: 'Name, date, and duration are required' });
    }

    const newContest = {
        id: contests.length + 1,
        name,
        date,
        duration,
        problems: problems || [],
        participants: [],
        setter
    };
    contests.push(newContest);
    res.status(201).json({
        message: 'Contest created successfully',
        contest: {
            id: newContest.id,
            name: newContest.name,
            date: newContest.date,
            duration: newContest.duration,
            problems: newContest.problems.length,
            participants: newContest.participants.length,
            setter: newContest.setter
        }
    });
});


app.post('/contests/problems', authenticate, (req, res) => {
    const currentUser = getUsernameFromToken(req.headers['authorization']);
    const { contestId, problemId, problemName, problemDescription, problemInput, problemOutput, category, difficulty, timelimit } = req.body;
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
    if (!contest.problems.includes(problemId)) {
        const newProblem = {
            id: problemId,
            name: problemName,
            description: problemDescription,
            input: problemInput,
            output: problemOutput,
            category,
            difficulty,
            timelimit
        };
        problems.push(newProblem);
        res.status(201).json({
            message: 'Problem added to contest successfully',
            problem: newProblem
        });
    }else{
        return res.status(400).send({ message: 'ProblemId already exists in the contest' });
    }
});


app.get('/contests/:id/problems', (req, res) => {
    res.send({ problems: `Problems of contest ${req.params.id}` });
});

app.get('/contests/:id/participants', (req, res) => {
    res.send({ participants: `Participants of contest ${req.params.id}` });
});

app.post('/contests/:id/join', (req, res) => {
    res.send({ message: `Joined contest ${req.params.id}` });
});

app.get('/contests/:id/leaderboard', (req, res) => {
    res.send({ leaderboard: `Leaderboard for contest ${req.params.id}` });
});

app.get('/contests/:id/participation/:userId', (req, res) => {
    res.send({ point: 100, rank: 1 });
});

// ---------- Problem ----------
app.get('/problems', (req, res) => {
    res.send(problems);
});

app.get('/problems/:id', (req, res) => {
    res.send({ problem: `Details of problem ${req.params.id}` });
});

app.post('/problems', (req, res) => {
    res.send({ message: 'New problem created' });
});

app.put('/problems/:id', (req, res) => {
    res.send({ message: `Problem ${req.params.id} updated` });
});

app.delete('/problems/:id', (req, res) => {
    res.send({ message: `Problem ${req.params.id} deleted` });
});

app.get('/problems/:id/submissions', (req, res) => {
    res.send({ submissions: `Submissions for problem ${req.params.id}` });
});

// ---------- Submission ----------
app.post('/problems/:id/submit', (req, res) => {
    res.send({ message: `Submission received for problem ${req.params.id}`, verdict: 'Accepted' });
});

app.get('/submissions', (req, res) => {
    res.send(submissions);
});

app.get('/submissions/:id', (req, res) => {
    res.send({ submission: `Details of submission ${req.params.id}` });
});

// ---------- Admin ----------
app.post('/admin/promote/:id', (req, res) => {
    res.send({ message: `User ${req.params.id} promoted to setter/admin` });
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
