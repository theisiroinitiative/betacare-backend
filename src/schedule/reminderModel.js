import { DataTypes } from 'sequelize';
import sequelize from '../config/dbConfig.js';

const Reminder = sequelize.define('Reminder', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    profileId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'user_profiles',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    phoneNumber: {
        type: DataTypes.STRING,
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('medication', 'exercise', 'diet', 'appointment', 'other'),
        allowNull: false
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    scheduledAt: {
        type: DataTypes.DATE,
        allowNull: false
    },
    recurrence: {
        type: DataTypes.ENUM('none', 'daily', 'weekly', 'monthly'),
        defaultValue: 'none',
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('pending', 'sent', 'cancelled'),
        defaultValue: 'pending',
        allowNull: false
    }
}, {
    tableName: 'reminders',
    timestamps: true
});

export default Reminder;
