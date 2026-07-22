import { DataTypes } from 'sequelize';
import sequelize from '../../config/dbConfig.js';

const Observation = sequelize.define('Observation', {
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
    symptom: {
        type: DataTypes.STRING,
        allowNull: false
    },
    severity: {
        type: DataTypes.ENUM('mild', 'moderate', 'severe'),
        allowNull: false
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    observedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false
    }
}, {
    tableName: 'observations',
    timestamps: true
});

export default Observation;
