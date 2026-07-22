import { DataTypes } from 'sequelize';
import sequelize from '../../config/dbConfig.js';

const Condition = sequelize.define('Condition', {
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
    conditionName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    severity: {
        type: DataTypes.ENUM('mild', 'moderate', 'severe'),
        allowNull: false
    },
    diagnosedAt: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive', 'remission'),
        defaultValue: 'active',
        allowNull: false
    }
}, {
    tableName: 'conditions',
    timestamps: true
});

export default Condition;
