import { DataTypes } from 'sequelize';
import sequelize from '../config/dbConfig.js';

const Department = sequelize.define('Department', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    organization_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'organizations',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    departmentName: {
        type: DataTypes.STRING(255),
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
    description: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    phone: {
        type: DataTypes.STRING(20)
    },
    email: {
        type: DataTypes.STRING(255),
        validate: {
            isEmail: true
        }
    },
    headOfDepartmentId: {
        type: DataTypes.UUID,
        references: {
            model: 'practitioners',
            key: 'id'
        },
        onDelete: 'SET NULL'
    },
    status: {
        type: DataTypes.ENUM('pending', 'approved'),
        defaultValue: 'pending'
    }
}, {
    tableName: 'departments',
    timestamps: true
});

export default Department;
