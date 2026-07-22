import { DataTypes } from 'sequelize';
import sequelize from '../../config/dbConfig.js';
import UserAuth from '../../auth/authModel.js';

const Token = sequelize.define('Token', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
        unique: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: UserAuth,
            key: 'email'
        }
    },
    token_string: {
        type: DataTypes.STRING(1000),
        allowNull: false
    },
    expiryStatus: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true // true = active/valid (upon creation), false = expired/invalid
    }
}, {
    tableName: 'tokens',
    timestamps: true
});

// Associations
UserAuth.hasMany(Token, { foreignKey: 'email', sourceKey: 'email' });
Token.belongsTo(UserAuth, { foreignKey: 'email', targetKey: 'email' });

export default Token;