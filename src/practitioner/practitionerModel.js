import { DataTypes } from 'sequelize';
import sequelize from '../config/dbConfig.js';

const Practitioner = sequelize.define('Practitioner', {
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
    department_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'departments',
            key: 'id'
        },
        onDelete: 'SET NULL'
    },
    job: {
        type: DataTypes.ENUM('doctor', 'nurse', 'lab_technician', 'pharmacist', 'hod'),
        allowNull: false
    },
    staffId: {
        type: DataTypes.STRING(50)
    },
    mdcnNumber: {
        type: DataTypes.STRING(50)
    },
    firstName: {
        type: DataTypes.STRING(255)
    },
    lastName: {
        type: DataTypes.STRING(255)
    },
    password: {
        type: DataTypes.STRING(255)
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
    username: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true
    },
    specialization: {
        type: DataTypes.STRING(255)
    },
    qualification: {
        type: DataTypes.STRING(255)
    },
    employmentStatus: {
        type: DataTypes.ENUM('full_time', 'part_time', 'locum', 'intern', 'volunteer'),
        defaultValue: 'full_time'
    },
    joinedAt: {
        type: DataTypes.DATEONLY
    },
    leftAt: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('approved', 'pending', 'rejected'),
        defaultValue: 'pending'
    }
}, {
    tableName: 'practitioners',
    timestamps: true
});

export default Practitioner;
