const { customAlphabet } = require('nanoid');

// Create a custom nanoid with only uppercase letters and numbers (easier to read/type)
const nanoid = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8);

const generateUniqueCode = () => {
    return nanoid();
};

module.exports = { generateUniqueCode };
