const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const router = require("express").Router();

const { jwtSecret } = require("../../config/secrets.js");
const Companies = require("./companies-model.js");
const restrict = require("../authenticate-middleware.js");

function signToken(company) {
	const payload = {
		company
	};

	const options = {
		expiresIn: "3d"
	};

	return jwt.sign(payload, jwtSecret, options);
}

// POST TO REGISTER COMPANY
router.post("/register", (req, res) => {
	let company = req.body;
	const hash = bcrypt.hashSync(company.password, 3); // 2 ^ n
	company.password = hash;

	Companies.add(company)
		.then(saved => {
			const token = signToken(company);
			res.status(201).json({ saved, token });
		})
		.catch(error => {
			res.status(500).json(error);
		});
});

// POST TO LOG IN AS COMPANY
router.post("/login", (req, res) => {
	let { company_email, password } = req.body;

	if (!company_email || !password) {
		res
			.status(401)
			.json({ message: "email and password are both required to login" });
	} else {
		Companies.findBy({ company_email })
			.first()
			.then(company => {
				if (company && bcrypt.compareSync(password, company.password)) {
					const token = signToken(company); // <<<<<<<<<<<

					res.status(200).json({ company, token }); // <<<<<<<<<<
				} else {
					res.status(401).json({ message: "Invalid Credentials" });
				}
			})
			.catch(error => {
				res.status(500).json(error);
			});
	}
});

//GET LIST OF ALL COMPANIES
router.get("/", restrict, (req, res) => {
	Companies.find()
		.then(companies => {
			res.json(companies);
		})
		.catch(err => res.send(err));
});

//GET COMPANY BY ID
router.get("/:id", restrict, async (req, res) => {
	const profile = await Companies.findById(req.params.id);
	if (profile) {
		res.status(200).json(profile);
	} else {
		console.log("error in GET api/companies/id");
		res
			.status(500)
			.json({ error: "The companies information could not be retrieved." });
	}
});

//UPDATE A SPECIFIC COMPANY
router.put("/:id", restrict, async (req, res) => {
	const {
		id,
		company_name,
		company_email,
		password,
		companies_description,
		companies_location,
		industry_type
	} = req.body;

	if (
		!id ||
		!company_name ||
		!company_email ||
		!password ||
		!companies_description ||
		!companies_location ||
		!industry_type
	) {
		res.status(400).json({
			message: "Missing data in request."
		});
	}
	try {
		const company = await Companies.findById(req.params.id);

		if (!company)
			return res.status(404).json({
				message: " Company Profile doesn't exist"
			});

		const updatedComp = await Companies.update(req.body);

		res.status(200).json(updatedComp);
	} catch (err) {
		res.status(500).json({
			message: " Something went wrong while updating company."
		});
	}
});

// DELETE A COMPANY
router.delete("/:id", restrict, (req, res) => {
	const { id } = req.params;

	Companies.remove(id)
		.then(deleted => {
			if (deleted) {
				res.json({ removed: deleted });
			} else {
				res
					.status(404)
					.json({ message: "Could not the company with given id" });
			}
		})
		.catch(err => {
			res.status(500).json({ message: "Failed to delete company" });
		});
});
module.exports = router;
