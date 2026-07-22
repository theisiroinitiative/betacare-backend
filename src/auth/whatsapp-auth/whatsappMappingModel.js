import { DataTypes } from 'sequelize';
import sequelize from '../../config/dbConfig.js';

const WhatsAppJidMapping = sequelize.define('WhatsAppJidMapping', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    phoneNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    whatsappJid: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    }
}, {
    tableName: 'whatsapp_jid_mappings',
    timestamps: true
});

export default WhatsAppJidMapping;
