import { DataTypes } from 'sequelize';
import sequelize from '../../config/dbConfig.js';

const VitalLog = sequelize.define('VitalLog', {
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
    bmi: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    bloodPressureSystolic: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    bloodPressureDiastolic: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    bloodSugar: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    temperature: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    pulseRate: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    loggedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false
    }
}, {
    tableName: 'vital_logs',
    timestamps: true
});

export default VitalLog;
