const express = require("express");
const ejs = require("ejs");
const mysql = require("mysql");
const pool = dbConnection();
const app = express();
const port = 3000;
const session = require("express-session");

const bcrypt = require("bcrypt");
const saltRounds = 10;
app.set("trust proxy", 1); // trust first proxy
app.use(
	session({
		secret: "keyboard cat",
		resave: false,
		saveUninitialized: true,
		cookie: { secure: true },
	}),
);

app.set("view engine", "ejs");
app.use(express.static("public"));

//we need this method for POST method
app.use(express.urlencoded({ extended: true }));

// Rendering login page first now
app.get("/", (req, res) => {
	res.render("login");
});

app.get("/home",isUserAuthenticated, (req, res) => {
	res.render("home");
});

app.get("/addAuthor", isUserAuthenticated, async (req, res) => {
	res.render("newAuthor");
});

//POPULATING THE AUTHOR INFO FROM DATABASE
app.get("/updateAuthor", isUserAuthenticated, async (req, res) => {
	let id = req.query.authorId;
	let sql = `SELECT * , DATE_FORMAT(dob,"%Y-%m-%d") as dobFormatted, DATE_FORMAT(dod,"%Y-%m-%d") as dodFormatted
            FROM q_authors
            WHERE authorId = ?`;
	let rows = await executeSQL(sql, [id]);
	//console.log(rows);
	res.render("updateAuthor", { authorInfo: rows[0] });
});

////POPULATING THE QUOTE INFO FROM DATABASE
app.get("/updateQuote", isUserAuthenticated, async (req, res) => {
	let id = req.query.quoteId;
	//Getting everything of the matching quoteId
	let sql = `SELECT * FROM q_quotes
            WHERE quoteId = ?`;
	let rows = await executeSQL(sql, [id]);
	//Getting all the categories
	let categorySql = `SELECT DISTINCT category FROM 
                     q_quotes `;
	let catResponse = await executeSQL(categorySql);
	//console.log(catResponse);
	//Getting all the authors but making the right author be at top
	let authorSql = `SELECT firstName, lastName, authorId FROM 
                     q_authors ORDER BY lastName`;
	let authorResponse = await executeSQL(authorSql);
	res.render("updateQuote", {
		quoteInfo: rows[0],
		categories: catResponse,
		authorInfo: authorResponse,
	});
});

app.post("/updateAuthor", isUserAuthenticated, async (req, res) => {
	let id = req.body.authorId;
	let fName = req.body.fname;
	let lName = req.body.lname;
	let dob = req.body.dob;
	let dod = req.body.dod;
	let sex = req.body.sex;
	let profession = req.body.profession;
	let country = req.body.country;
	let portrait = req.body.portrait;
	let biography = req.body.biography;
	let sql = `UPDATE q_authors 
            SET firstName = ?,
            lastName = ?,
            dob = ?,
            dod = ?,
            sex = ?,
            profession = ?,
            country = ?,
            portrait = ?,
            biography = ?
            WHERE authorId = ?`;
	let params = [
		fName,
		lName,
		dob,
		dod,
		sex,
		profession,
		country,
		portrait,
		biography,
		id,
	];
	let rows = await executeSQL(sql, params);

	res.redirect("/authorList");
});

//POST UPDATE QUOTE
app.post("/updateQuote", isUserAuthenticated, async (req, res) => {
	let id = req.body.quoteId;
	let quote = req.body.quote;
	let category = req.body.category;
	let authorId = req.body.author;

	let sql = `UPDATE q_quotes 
            SET quote = ?,
            category = ?,
            authorId = ?
            WHERE quoteId = ?`;
	let params = [quote, category, authorId, id];
	let rows = await executeSQL(sql, params);

	res.redirect("/quoteList");
});
//DELETE AUTHOR
app.get("/deleteAuthor", isUserAuthenticated, async (req, res) => {
	let id = req.query.authorId;
	console.log(id);
  // alert('Are you sure want to delete the author?')
	let sql = `DELETE FROM q_authors 
              WHERE authorId = ?`;
	let params = [id];
	let rows = await executeSQL(sql, params);

	res.redirect("/authorList");
});

//DELETE QUOTE
app.get("/deleteQuote", isUserAuthenticated, async (req, res) => {
	let id = req.query.quoteId;
		console.log(id);
	let sql = `DELETE FROM q_quotes 
              WHERE quoteId = ?`;
	let params = [id];
	let rows = await executeSQL(sql, params);

	res.redirect("/quoteList");
});

//ADD AUTHOR TO DATABASE
app.post("/addAuthor", isUserAuthenticated, async (req, res) => {
	let firstName = req.body.fname;
	let lastName = req.body.lname;
	let dob = req.body.dob;
	let dod = req.body.dod;
	let sex = req.body.sex;
	let profession = req.body.profession;
	let country = req.body.country;
	let portrait = req.body.portrait;
	let biography = req.body.biography;
	let query = `INSERT INTO q_authors (firstName, lastName, dob, dod, sex, profession, country, portrait, biography) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
	let params = [
		firstName,
		lastName,
		dob,
		dod,
		sex,
		profession,
		country,
		portrait,
		biography,
	];
	executeSQL(query, params);
	res.redirect("/addAuthor");
});

app.get("/addQuote", isUserAuthenticated, async (req, res) => {
	let sqlQuotes = `SELECT DISTINCT category FROM q_quotes;`;
	let categories = await executeSQL(sqlQuotes);

	let sqlAuthors = `SELECT firstname, lastname, authorId FROM q_authors;`;
	let authors = await executeSQL(sqlAuthors);

	//console.log(categories);
	res.render("newQuote", { categories: categories, authors: authors });
});

//ADD QUOTE TO DATABASE
app.post("/addQuote", isUserAuthenticated, async (req, res) => {
	let quote = req.body.quote;
	let authorId = req.body.authorId;
	let category = req.body.categories;
	let likes = req.body.likes;
	let query = `INSERT INTO q_quotes (quote, authorId, category, likes) VALUES (?, ?, ?, ?)`;
	let params = [quote, authorId, category, likes];
	executeSQL(query, params);
	// console.log(query);
	res.redirect("/addQuote");
});

//displayAuthors for updates
app.get("/authorList", isUserAuthenticated, async (req, res) => {
	let sql = `SELECT  firstName, lastName, authorId
                FROM q_authors ORDER BY lastName`;
	let rows = await executeSQL(sql);
	res.render("authorList", { authorList: rows });
});

//displayQuotes for updates
app.get("/quoteList", isUserAuthenticated, async (req, res) => {
	let sql = `SELECT  quote, quoteId
                FROM q_quotes `;
	let rows = await executeSQL(sql);
	//console.log(rows);
	res.render("quoteList", { quoteList: rows });
});
app.get("/login", async(req,res) =>{
	res.redirect("home");
});
//Authentication
app.post("/login", async (req, res) => {
	let username = req.body.username;
	let password = req.body.password;
	console.log(password);

	let hashedPassword = "";

	let sql = `SELECT *
              FROM admin
              WHERE username = ?`;
	let rows = await executeSQL(sql, [username]);
	console.log(rows)
	if (rows.length > 0) {
		//username was found
		hashedPassword = rows[0].password;
	}

	const match = await bcrypt.compare(password, hashedPassword);
console.log(match)
	if (match) {
		req.session.authenticated = true;
		req.session.fullName = rows[0].firstName + " " + rows[0].lastName;
		res.render("home.ejs");
	} else {
		res.render("login.ejs", { error: "Wrong credentials!" });
	}
});

app.get("/logout", (req, res) => {
	req.session.destroy();
	res.render("login.ejs");
});

// function for executing sql *******************************
async function executeSQL(sql, params) {
	return new Promise(function (resolve, reject) {
		pool.query(sql, params, function (err, rows, fields) {
			if (err) throw err;
			resolve(rows);
		});
	});
}

function dbConnection() {
	const pool = mysql.createPool({
		connectionLimit: 10,
		host: "o677vxfi8ok6exrd.cbetxkdyhwsb.us-east-1.rds.amazonaws.com",
		user: "byw827mlzqnejooj",
		password: "bgmolglh3bcfb1zo",
		database: "kpjwlut0aloa3d2h",
	});
	return pool;
}

//************************************************************
function isUserAuthenticated(req, res, next) {
	if (req.session.authenticated) {
		// go ahead and keep processing request
		next();
	} else {
		res.render("login.ejs");
	}
}

app.listen(port, () => {
	console.log(`Server is running on http://localhost:${port}`);
});
