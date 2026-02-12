# Event Templates Feature

## Overview

The Event Templates feature allows users to create reusable templates for events, making it easier to set up new events with predefined structures, settings, and configurations.

## Features

### 1. Template Selection During Event Creation
- **Location**: First step of event creation (Basic Info)
- **Component**: `TemplateSelector` component
- **Functionality**: Browse and select from available templates
- **Benefits**: Quick setup with predefined event structures

### 2. Save Current Event as Template
- **Location**: Review step (Step 5) of event creation
- **Component**: `SaveAsTemplateDialog` component
- **Functionality**: Save current event configuration as a reusable template
- **Benefits**: Preserve successful event configurations for future use

### 3. Template Management
- **Location**: Dedicated `/templates` page
- **Features**:
  - View all available templates (personal and public)
  - Create new templates from scratch
  - Delete custom templates
  - Use templates to create new events

## Database Schema

### Tables Created
1. **`event_templates`** - Main template metadata
2. **`event_template_details`** - Template event details
3. **`event_template_itineraries`** - Template itinerary items
4. **`event_template_volunteer_roles`** - Template volunteer roles
5. **`event_template_pre_event_tasks`** - Template pre-event tasks

### Key Features
- **User Ownership**: Templates are tied to specific users
- **Public Templates**: System-provided templates available to all users
- **Row Level Security**: Users can only access their own templates and public ones
- **Cascading Deletes**: Deleting a template removes all related data

## Components

### TemplateSelector
- **Purpose**: Select templates during event creation
- **Features**:
  - Browse available templates
  - Preview template details
  - Apply template to current event
  - Clear selected template

### SaveAsTemplateDialog
- **Purpose**: Save current event as template
- **Features**:
  - Set template name and description
  - Choose public/private visibility
  - Include all event components (details, itinerary, tasks)

### Templates Page
- **Purpose**: Manage all templates
- **Features**:
  - Grid view of available templates
  - Create new templates
  - Delete custom templates
  - Use templates to create events

## Usage

### Using a Template
1. Navigate to Event Creation page
2. In Step 1 (Basic Info), click "Browse Templates"
3. Select desired template
4. Click "Use Template"
5. Template data will populate the form
6. Customize as needed

### Saving as Template
1. Complete event creation steps
2. In Review step, find "Save as Template" section
3. Click "Save as Template"
4. Enter template name and description
5. Choose public/private visibility
6. Click "Save Template"

### Managing Templates
1. Navigate to `/templates` page
2. View all available templates
3. Create new templates from scratch
4. Delete custom templates
5. Use templates to create new events

## Sample Templates

The system includes several pre-built templates:

1. **Community Gathering**
   - Standard community event structure
   - Basic setup and volunteer roles
   - Casual tone, medium marketing level

2. **Educational Workshop**
   - Workshop-focused structure
   - Detailed itineraries
   - Formal tone, high marketing level

3. **Social Event**
   - Casual social gathering
   - Minimal structure
   - Fun tone, low marketing level

## Technical Implementation

### Hooks
- **`useEventTemplates`**: Manages template CRUD operations
- **Features**:
  - Load templates (personal + public)
  - Create new templates
  - Delete templates
  - Load template details

### State Management
- Templates are loaded and managed locally
- Real-time updates when templates are created/deleted
- User-specific template filtering

### Security
- Row Level Security (RLS) policies
- Users can only access their own templates + public ones
- Template creation requires authentication

## Future Enhancements

### Potential Improvements
1. **Template Categories**: Organize templates by event type
2. **Template Sharing**: Share templates between users
3. **Template Versioning**: Track template changes over time
4. **Bulk Operations**: Apply templates to multiple events
5. **Template Analytics**: Track template usage and success rates

### Advanced Features
1. **Template Inheritance**: Create templates based on other templates
2. **Conditional Logic**: Dynamic template behavior based on event type
3. **Template Marketplace**: Community-contributed templates
4. **AI-Powered Suggestions**: Recommend templates based on event details

## File Structure

```
src/
├── components/event-creation/
│   ├── TemplateSelector.tsx          # Template selection during creation
│   └── SaveAsTemplateDialog.tsx      # Save current event as template
├── hooks/
│   └── useEventTemplates.tsx         # Template management hook
├── pages/
│   └── Templates.tsx                 # Template management page
├── types/
│   └── eventTemplates.ts             # Template type definitions
└── supabase/migrations/
    └── 20250823042767_create_event_templates.sql  # Database schema
```

## Migration Notes

The feature requires database migration `20250823042767_create_event_templates.sql` which:
- Creates all necessary template tables
- Sets up RLS policies
- Inserts sample public templates
- Establishes proper relationships and constraints

## Troubleshooting

### Common Issues
1. **Templates not loading**: Check user authentication and RLS policies
2. **Template creation fails**: Verify all required fields are filled
3. **Template not applying**: Check template data structure compatibility

### Debug Steps
1. Check browser console for errors
2. Verify database migration was applied
3. Check user permissions and RLS policies
4. Validate template data structure

## Support

For issues or questions regarding the Event Templates feature:
1. Check this documentation
2. Review database migration logs
3. Check browser console for errors
4. Verify user authentication status
