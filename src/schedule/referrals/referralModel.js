import { DataTypes } from 'sequelize';
import sequelize from '../../config/dbConfig.js';

const Referral = sequelize.define('referrals', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    referrerid: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    referrerType: {
        type: DataTypes.ENUM("organisation", "department")
    },
    target: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "The target Department/Practitioner the referral code is meant for."
    },
    deleteAt: {
        type: DataTypes.DATE,
        allowNull: false
    },
    referralCode: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('fresh', 'used', 'pending', 'approved'),
        defaultValue: 'fresh',
        allowNull: false
    }
}, {
    tableName: 'referrals',
    timestamps: true
});

export default Referral;
