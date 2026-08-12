const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// User Auth validators (from stage 1)
export function validateRegister(req, res, next) {
    const { firstname, lastname, email, password, phoneNumber } = req.body;
    if (!firstname || typeof firstname !== 'string' || firstname.trim() === '') {
        return res.status(400).json({ error: 'Firstname is required.' });
    }
    if (!lastname || typeof lastname !== 'string' || lastname.trim() === '') {
        return res.status(400).json({ error: 'Lastname is required.' });
    }
    if (!email || !emailRegex.test(email)) {
        return res.status(400).json({ error: 'A valid email is required.' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({ error: 'Password is required and must be at least 6 characters.' });
    }
    if (!phoneNumber || typeof phoneNumber !== 'string' || phoneNumber.trim() === '') {
        return res.status(400).json({ error: 'Phone number is required.' });
    }
    next();
}

export function validateVerifyOTP(req, res, next) {
    const { otpcode, email } = req.body;
    if (!email || !emailRegex.test(email)) {
        return res.status(400).json({ error: 'A valid email is required.' });
    }
    if (!otpcode || typeof otpcode !== 'string' || otpcode.trim().length !== 6) {
        return res.status(400).json({ error: 'OTP code is required and must be 6 digits.' });
    }
    next();
}

export function validateVerifyAccount(req, res, next) {
    const { email } = req.body;
    if (!email || !emailRegex.test(email)) {
        return res.status(400).json({ error: 'A valid email is required.' });
    }
    next();
}

export function validatePasswordReset(req, res, next) {
    const { newpassword } = req.body;
    if (!newpassword || typeof newpassword !== 'string' || newpassword.length < 6) {
        return res.status(400).json({ error: 'New password is required and must be at least 6 characters.' });
    }
    next();
}

export function validateLogin(req, res, next) {
    const { email, password } = req.body;
    if (!email || !emailRegex.test(email)) {
        return res.status(400).json({ error: 'A valid email is required.' });
    }
    if (!password) {
        return res.status(400).json({ error: 'Password is required.' });
    }
    next();
}

// Practitioner Doctor Registration validator
export function validatePractitionerRegister(req, res, next) {
    const { email, phone, username, firstName, lastName, password, mdcnNumber } = req.body;
    if (!mdcnNumber || typeof mdcnNumber !== 'string' || mdcnNumber.trim() === '') {
        return res.status(400).json({ error: 'mdcnNumber is required for doctor registration.' });
    }
    if (!email || !emailRegex.test(email)) return res.status(400).json({ error: 'A valid email is required.' });
    if (!phone || typeof phone !== 'string' || phone.trim() === '') return res.status(400).json({ error: 'phone is required.' });
    if (!username || typeof username !== 'string' || username.trim() === '') return res.status(400).json({ error: 'username is required.' });
    if (!firstName || typeof firstName !== 'string' || firstName.trim() === '') return res.status(400).json({ error: 'firstName is required.' });
    if (!lastName || typeof lastName !== 'string' || lastName.trim() === '') return res.status(400).json({ error: 'lastName is required.' });
    if (!password || typeof password !== 'string' || password.length < 6) return res.status(400).json({ error: 'password is required and must be at least 6 characters.' });
    next();
}

export function validateUserProfileOnboard(req, res, next) {
    const {
        firstName,
        lastName,
        gender,
        dateOfBirth,
        phoneNumber,
        bloodGroup,
        genotype,
        emergencyContactName,
        emergencyContactPhone,
        emergencyContactEmail
    } = req.body;

    if (!firstName || firstName.trim() === '') return res.status(400).json({ error: 'firstName is required.' });
    if (!lastName || lastName.trim() === '') return res.status(400).json({ error: 'lastName is required.' });
    if (!gender || !['male', 'female', 'other'].includes(gender)) return res.status(400).json({ error: 'gender must be male, female, or other.' });
    if (!dateOfBirth || dateOfBirth.trim() === '') return res.status(400).json({ error: 'dateOfBirth is required.' });
    if (!phoneNumber || phoneNumber.trim() === '') return res.status(400).json({ error: 'phoneNumber is required.' });
    if (!bloodGroup || !['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].includes(bloodGroup)) return res.status(400).json({ error: 'bloodGroup must be a valid blood type.' });
    if (!genotype || !['AA', 'AS', 'SS', 'AC', 'SC'].includes(genotype)) return res.status(400).json({ error: 'genotype must be AA, AS, SS, AC, or SC.' });
    if (!emergencyContactName || emergencyContactName.trim() === '') return res.status(400).json({ error: 'emergencyContactName is required.' });
    if (!emergencyContactPhone || emergencyContactPhone.trim() === '') return res.status(400).json({ error: 'emergencyContactPhone is required.' });
    if (!emergencyContactEmail || !emailRegex.test(emergencyContactEmail)) return res.status(400).json({ error: 'A valid emergencyContactEmail is required.' });

    next();
}

