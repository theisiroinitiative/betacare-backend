import { DataTypes } from 'sequelize';
import sequelize from '../../config/dbConfig.js';

const MedicationLog = sequelize.define('MedicationLog', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    medicationId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'medications',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    takenAt: {
        type: DataTypes.DATE,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('taken', 'missed', 'skipped'),
        defaultValue: 'taken',
        allowNull: false
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'medication_logs',
    timestamps: true
});

export default MedicationLog;
