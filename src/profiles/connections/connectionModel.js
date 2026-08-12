import { DataTypes } from 'sequelize';
import sequelize from '../../config/dbConfig.js';

const Connection = sequelize.define('Connection', {
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
    practitionerId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'practitioners',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    status: {
        type: DataTypes.ENUM('active', 'expired', 'revoked'),
        defaultValue: 'active',
        allowNull: false
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: false
    }
}, {
    tableName: 'connections',
    timestamps: true
});

export default Connection;
