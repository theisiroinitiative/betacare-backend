import { DataTypes } from 'sequelize';
import sequelize from '../../config/dbConfig.js';

const UserProfile = sequelize.define('UserProfile', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: {
            model: 'auths',
            key: 'userId'
        },
        onDelete: 'CASCADE'
    },
    firstName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    lastName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    gender: {
        type: DataTypes.ENUM('male', 'female', 'other'),
        allowNull: false
    },
    dateOfBirth: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    phoneNumber: {
        type: DataTypes.STRING,
        allowNull: false
    },
    bloodGroup: {
        type: DataTypes.ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'),
        allowNull: false
    },
    genotype: {
        type: DataTypes.ENUM('AA', 'AS', 'SS', 'AC', 'SC'),
        allowNull: false
    },
    emergencyContactName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    emergencyContactPhone: {
        type: DataTypes.STRING,
        allowNull: false
    },
    emergencyContactEmail: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            isEmail: true
        }
    },
    linkedPractitioners: {
        type: DataTypes.JSONB,
        defaultValue: []
    }
}, {
    tableName: 'user_profiles',
    timestamps: true
});

export default UserProfile;
