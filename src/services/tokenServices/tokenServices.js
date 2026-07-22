import Token from './tokenModel.js';

class TokenDbService {
    async storeRefreshToken(email, tokenString) {
        return await Token.create({
            email,
            token_string: tokenString,
            expiryStatus: true
        });
    }

    async findRefreshToken(email, tokenString) {
        return await Token.findOne({
            where: {
                email,
                token_string: tokenString
            }
        });
    }

    async invalidateRefreshToken(tokenString) {
        return await Token.update(
            { expiryStatus: false },
            {
                where: {
                    token_string: tokenString
                }
            }
        );
    }
}

export default new TokenDbService();
