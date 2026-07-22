import { DataTypes } from 'sequelize';
import sequelize from '../../config/dbConfig.js';

const Medication = sequelize.define('Medication', {
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
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    dosage: {
        type: DataTypes.STRING
    },
    frequency: {
        type: DataTypes.STRING
    },
    startDate: {
        type: DataTypes.DATEONLY
    },
    endDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
    }
}, {
    tableName: 'medications',
    timestamps: true
});

export default Medication;
