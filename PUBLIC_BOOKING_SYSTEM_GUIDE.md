# Public Booking System for Online Conferences

## Overview

This system allows patients to book appointments with doctors through public links, with full support for online conferencing via Google Meet integration. The system is built on top of the existing appointment management infrastructure.

## Features Implemented

### 🏥 Organization-Based Public Booking

- **Simple Setup**: Uses organization slug directly for public URLs
- **Auto-Generated Titles**: "Book with [Organization Name]"
- **Flexible Descriptions**: Uses organization description field
- **Logo Support**: Displays organization logo on booking page

### 🔗 Public Booking URLs

- **Format**: `/book/[organization-slug]`
- **Example**: `/book/dr-smith-clinic`
- **SEO Friendly**: Clean, readable URLs
- **Unique Slugs**: Automatic slug generation with conflict resolution

### 📅 Smart Appointment Scheduling

- **Real-time Availability**: Shows available time slots based on organization schedule
- **Conflict Prevention**: Checks for existing appointments
- **Multiple Appointment Types**: Support for different consultation types
- **Duration Management**: Configurable slot durations and buffer times

### 🎥 Online Conference Integration

- **Google Meet Integration**: Automatic meeting link creation
- **Conditional Online Meetings**: Only for specific appointment types
- **Meeting Links in Emails**: Direct access to video calls
- **Calendar Integration**: Syncs with Google Calendar

### 👤 Patient Management

- **Smart Patient Lookup**: Finds existing patients by email
- **Automatic Patient Creation**: Creates new patient records as needed
- **Organization Linking**: Links patients to the booking organization
- **Data Collection**: Captures essential patient information

### 📧 Email Notifications

- **Rich HTML Emails**: Professional, branded confirmation emails
- **Meeting Links**: Includes Google Meet links for online appointments
- **Appointment Details**: Complete booking information
- **Important Instructions**: Guidelines for patients

### ⚙️ Organization Settings

- **Public Booking Toggle**: Enable/disable public booking
- **Slug Management**: Generate and customize booking URLs
- **Description Management**: Set public-facing descriptions
- **URL Preview**: Live preview of booking page
- **Copy & Share**: Easy URL copying and sharing

## Database Schema Changes

### Organization Table

```sql
-- Added fields to organization table
ALTER TABLE organization
ADD COLUMN description TEXT,
ADD COLUMN public_booking_enabled BOOLEAN DEFAULT FALSE;
```

### Appointment Config Table

```sql
-- Added field to organization_appointment_config table
ALTER TABLE organization_appointment_config
ADD COLUMN public_booking_enabled BOOLEAN DEFAULT FALSE NOT NULL;
```

## API Endpoints

### Public Booking Router (`/api/trpc/publicBooking`)

#### `getOrganizationBySlug`

- **Input**: `{ slug: string }`
- **Output**: Organization details, appointment types, and configuration
- **Authentication**: None (public endpoint)

#### `getAvailableSlots`

- **Input**: `{ slug: string, date: string }`
- **Output**: Available time slots for the specified date
- **Authentication**: None (public endpoint)

#### `bookAppointment`

- **Input**: Appointment details and patient information
- **Output**: Booking confirmation with meeting link
- **Authentication**: None (public endpoint)
- **Side Effects**: Creates patient, appointment, and sends email

### Organizations Router (`/api/trpc/organizations`)

#### `update`

- **Input**: Organization update data including public booking settings
- **Output**: Updated organization
- **Authentication**: Organization member required

## Components

### Public Booking Page (`/app/book/[slug]/page.tsx`)

- **Responsive Design**: Works on desktop and mobile
- **Step-by-Step Flow**: Appointment type → Date → Time → Patient info
- **Real-time Validation**: Immediate feedback on form inputs
- **Success States**: Clear confirmation with meeting links
- **Error Handling**: Graceful error messages

### Public Booking Settings (`/components/organization/public-booking-settings.tsx`)

- **Toggle Control**: Enable/disable public booking
- **Slug Generator**: Auto-generate from organization name
- **URL Preview**: Live preview with copy functionality
- **Description Editor**: Rich text editing for descriptions
- **Validation**: Real-time validation of settings

## Usage Instructions

### For Healthcare Organizations

1. **Enable Public Booking**:
   - Go to Organization Settings
   - Enable "Public Booking"
   - Generate or customize your booking URL slug
   - Add an organization description

2. **Configure Appointment Types**:
   - Create appointment types for different consultation types
   - Set appropriate durations and colors
   - Configure which types support online conferencing

3. **Set Up Availability**:
   - Configure your weekly availability schedule
   - Set slot durations and buffer times
   - Add any schedule overrides for holidays/breaks

4. **Enable Online Conferencing** (Optional):
   - Connect Google Calendar integration
   - Enable online conferencing for specific appointment types
   - Test meeting link generation

5. **Share Your Booking Link**:
   - Copy the public booking URL
   - Share on website, social media, or in emails
   - Monitor bookings in your dashboard

### For Patients

1. **Access Booking Page**:
   - Visit the organization's public booking URL
   - View organization information and available services

2. **Select Appointment Type**:
   - Choose from available consultation types
   - See duration and online meeting indicators

3. **Pick Date and Time**:
   - Select preferred date from dropdown
   - Choose from available time slots

4. **Provide Information**:
   - Enter name, email, and phone number
   - Add any additional notes or requests

5. **Confirm Booking**:
   - Review appointment details
   - Submit booking
   - Receive confirmation email with details

## Email Templates

### Booking Confirmation Email

- **Professional Design**: Clean, branded layout
- **Complete Details**: All appointment information
- **Meeting Links**: Direct access for online appointments
- **Instructions**: Clear guidelines for patients
- **Responsive**: Works on all email clients

## Security & Privacy

### Data Protection

- **Patient Privacy**: Secure handling of patient information
- **Email Security**: Encrypted email transmission
- **Access Control**: Organization-scoped data access

### Validation

- **Input Sanitization**: All user inputs are validated
- **Conflict Detection**: Prevents double-booking
- **Rate Limiting**: Protection against abuse

## Integration Points

### Existing Systems

- **Appointment Management**: Integrates with existing appointment system
- **Patient Records**: Uses existing patient database
- **Email Service**: Leverages existing email infrastructure
- **Google Calendar**: Uses existing Google integration

### Future Enhancements

- **Payment Integration**: Support for booking fees
- **SMS Notifications**: Text message confirmations
- **Multi-language**: Internationalization support
- **Advanced Scheduling**: Recurring appointments
- **Waitlist Management**: Automatic rebooking from cancellations

## Testing Checklist

- [x] Database schema migration
- [x] Public booking URL generation
- [x] Appointment type selection
- [x] Available slot calculation
- [x] Patient creation/lookup
- [x] Online meeting link generation
- [x] Email confirmation sending
- [x] Organization settings management
- [x] Error handling and validation
- [ ] End-to-end booking flow testing
- [ ] Online conferencing integration testing
- [ ] Email delivery testing
- [ ] Mobile responsiveness testing

## Deployment Notes

1. **Run Database Migration**:

   ```sql
   -- Execute the migration script
   \i database-migration-public-booking.sql
   ```

2. **Environment Variables**:
   - Ensure `RESEND_API_KEY` is set for email sending
   - Google Calendar credentials for meeting links

3. **DNS/Routing**:
   - Ensure `/book/*` routes are properly configured
   - Test public accessibility

## Support & Maintenance

### Monitoring

- Monitor email delivery rates
- Track booking conversion rates
- Watch for error patterns in logs

### Updates

- Keep appointment types synchronized
- Update availability schedules
- Maintain organization information

This public booking system provides a complete solution for online appointment booking with integrated video conferencing, making it easy for patients to schedule appointments while maintaining the professional workflow for healthcare providers.
