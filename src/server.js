import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import yaml from 'yamljs';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import { fileURLToPath } from 'url';

// Import Sequelize database config
import sequelize from './config/dbConfig.js';

// Import models to ensure they register with Sequelize before syncing
import UserAuth from './auth/authModel.js';
import Token from './services/tokenServices/tokenModel.js';
import User from './config/users/userModel.js';
import Organization from './organization/organizationModel.js';
import Department from './department/departmentModel.js';
import Practitioner from './practitioner/practitionerModel.js';
import UserProfile from './profiles/healthProfiles/healthModel.js';
import Condition from './profiles/conditions/conditionModel.js';
import Medication from './profiles/medications/medicationModel.js';
import MedicationLog from './profiles/medicationLogs/medicationLogModel.js';
import VitalLog from './profiles/vitalLog/vitalLogModel.js';
import WhatsAppJidMapping from './auth/whatsapp-auth/whatsappMappingModel.js';
import Observation from './profiles/observation/observationModel.js';
import Reminder from './schedule/reminderModel.js';
import { startReminderScheduler } from './schedule/reminderScheduler.js';
import whatsappBotService from './agent/agentServices.js';

// Import routers
import authRoutes from './auth/authRoutes.js';
import organizationRoutes from './organization/organizationRoutes.js';
import departmentRoutes from './department/departmentRoutes.js';
import practitionerRoutes from './practitioner/practitionerRoutes.js';
import healthRoutes from './profiles/healthProfiles/healthRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Resolve __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middlewares
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve API routes
app.use('/auth', authRoutes);
app.use('/auth/user/profile', healthRoutes); // Stage 2 onboarding route
app.use('/organization', organizationRoutes);
app.use('/department', departmentRoutes);
app.use('/practitioner', practitionerRoutes);

// Load Swagger document
try {
    const swaggerDocument = yaml.load(path.join(__dirname, 'config', 'swagger.yaml'));
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
    console.log('Swagger UI successfully initialized at /api-docs');
} catch (error) {
    console.error('Failed to load swagger.yaml:', error.message);
}

// Set up model associations
// 1. Organization & Department
Organization.hasMany(Department, { foreignKey: 'organization_id', onDelete: 'CASCADE' });
Department.belongsTo(Organization, { foreignKey: 'organization_id' });

// 2. Organization & Practitioner
Organization.hasMany(Practitioner, { foreignKey: 'organization_id', onDelete: 'CASCADE' });
Practitioner.belongsTo(Organization, { foreignKey: 'organization_id' });

// 3. Department & Practitioner
Department.hasMany(Practitioner, { foreignKey: 'department_id', onDelete: 'SET NULL' });
Practitioner.belongsTo(Department, { foreignKey: 'department_id' });

// 4. Department HOD
Department.belongsTo(Practitioner, { as: 'HOD', foreignKey: 'headOfDepartmentId', constraints: false });

// 5. Admin User & Organization
User.hasMany(Organization, { foreignKey: 'verifiedBy', onDelete: 'SET NULL' });
Organization.belongsTo(User, { foreignKey: 'verifiedBy', as: 'verifier', constraints: false });

// 6. UserAuth & UserProfile
UserAuth.hasOne(UserProfile, { foreignKey: 'userId', onDelete: 'CASCADE' });
UserProfile.belongsTo(UserAuth, { foreignKey: 'userId' });

// 7. UserProfile & Condition
UserProfile.hasMany(Condition, { foreignKey: 'profileId', onDelete: 'CASCADE' });
Condition.belongsTo(UserProfile, { foreignKey: 'profileId' });

// 8. UserProfile & Medication
UserProfile.hasMany(Medication, { foreignKey: 'profileId', onDelete: 'CASCADE' });
Medication.belongsTo(UserProfile, { foreignKey: 'profileId' });

// 9. Medication & MedicationLog
Medication.hasMany(MedicationLog, { foreignKey: 'medicationId', onDelete: 'CASCADE' });
MedicationLog.belongsTo(Medication, { foreignKey: 'medicationId' });

// 10. UserProfile & VitalLog
UserProfile.hasMany(VitalLog, { foreignKey: 'profileId', onDelete: 'CASCADE' });
VitalLog.belongsTo(UserProfile, { foreignKey: 'profileId' });

// 11. UserAuth & WhatsApp JID Mapping
UserAuth.hasOne(WhatsAppJidMapping, { foreignKey: 'phoneNumber', sourceKey: 'phoneNumber', onDelete: 'CASCADE' });
WhatsAppJidMapping.belongsTo(UserAuth, { foreignKey: 'phoneNumber', targetKey: 'phoneNumber' });

// 12. UserProfile & Observation
UserProfile.hasMany(Observation, { foreignKey: 'profileId', onDelete: 'CASCADE' });
Observation.belongsTo(UserProfile, { foreignKey: 'profileId' });

// 13. UserProfile & Reminder
UserProfile.hasMany(Reminder, { foreignKey: 'profileId', onDelete: 'CASCADE' });
Reminder.belongsTo(UserProfile, { foreignKey: 'profileId' });

// Database Connection & Sync
async function initializeDatabase() {
    try {
        await sequelize.authenticate();
        console.log('Database connection authenticated successfully.');

        // Sync models
        await sequelize.sync({ force: false });
        console.log('Database models synchronized successfully.');

        // Start the reminder scheduler after DB is ready
        startReminderScheduler();

        // Initialize WhatsApp bot service
        await whatsappBotService.init();
    } catch (error) {
        console.error('Database initialization failed:', error);
    }
}

// Start Server
app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
    await initializeDatabase();
});

export default app;
