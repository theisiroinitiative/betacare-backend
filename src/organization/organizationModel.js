import { DataTypes } from 'sequelize';
import sequelize from '../config/dbConfig.js';

const Organization = sequelize.define('Organization', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM(
            'general_hospital',
            'specialist_hospital',
            'clinic',
            'health_centre',
            'maternity_home',
            'diagnostic_centre'
        ),
        allowNull: false
    },
    ownership: {
        type: DataTypes.ENUM('federal', 'state', 'private', 'ngo', 'faith_based'),
        allowNull: false
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
            isEmail: true
        }
    },
    phone: {
        type: DataTypes.STRING(20)
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    username: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: true
    },
    address: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    state: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    role: {
        type: DataTypes.STRING,
        defaultValue: 'organization',
        allowNull: false
    },
    lga: {
        type: DataTypes.STRING(100)
    },
    registrationNumber: {
        type: DataTypes.STRING(100),
        unique: true
    },
    status: {
        type: DataTypes.ENUM('pending', 'active', 'suspended'),
        defaultValue: 'pending'
    },
    verifiedBy: {
        type: DataTypes.UUID,
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'SET NULL'
    },
    verifiedAt: {
        type: DataTypes.DATE
    }
}, {
    tableName: 'organizations',
    timestamps: true
});

export default Organization;
