export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'BitMax Production Ticketing & Email Support System API',
    version: '2.0.0',
    description:
      'Complete enterprise REST API for multi-role ticketing, bidirectional email synchronization, lifecycle state management, and real-time support.',
    contact: {
      name: 'BitMax Engineering Team',
      email: 'support@bitmax.local',
    },
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Local Development Server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  paths: {
    '/api/health': {
      get: {
        summary: 'Service Health Check',
        tags: ['Health'],
        responses: {
          200: { description: 'System healthy' },
        },
      },
    },
    '/api/auth/register': {
      post: {
        summary: 'Register a new user account',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'phone', 'password'],
                properties: {
                  name: { type: 'string', example: 'Alice Customer' },
                  email: { type: 'string', example: 'alice@example.com' },
                  phone: { type: 'string', example: '+1234567890' },
                  password: { type: 'string', example: 'Secret123!' },
                  role: { type: 'string', enum: ['customer', 'agent', 'admin'], default: 'customer' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'User registered, OTP sent' },
          409: { description: 'User already exists' },
        },
      },
    },
    '/api/auth/verify-otp': {
      post: {
        summary: 'Verify OTP code for registration',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'otp'],
                properties: {
                  email: { type: 'string', example: 'alice@example.com' },
                  otp: { type: 'string', example: '123456' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'OTP verified, tokens issued' },
        },
      },
    },
    '/api/auth/login-password': {
      post: {
        summary: 'Login using email and password',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'agent@bitmax.local' },
                  password: { type: 'string', example: 'Password123!' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Login successful' },
          401: { description: 'Invalid credentials' },
          403: { description: 'Account locked or unverified' },
        },
      },
    },
    '/api/auth/login-otp': {
      post: {
        summary: 'Request login OTP via email or phone',
        tags: ['Auth'],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', example: 'alice@example.com' },
                  phone: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'OTP dispatched' } },
      },
    },
    '/api/auth/verify-login-otp': {
      post: {
        summary: 'Verify login OTP',
        tags: ['Auth'],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['otp'],
                properties: {
                  email: { type: 'string' },
                  phone: { type: 'string' },
                  otp: { type: 'string', example: '123456' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Login successful' } },
      },
    },
    '/api/auth/refresh-token': {
      post: {
        summary: 'Refresh access token',
        tags: ['Auth'],
        responses: { 200: { description: 'Fresh access token returned' } },
      },
    },
    '/api/auth/logout': {
      post: {
        summary: 'Logout and revoke refresh token',
        tags: ['Auth'],
        responses: { 200: { description: 'Logged out' } },
      },
    },
    '/api/tickets': {
      get: {
        summary: 'List tickets with filters, search, pagination and role isolation',
        tags: ['Tickets'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'priority', in: 'query', schema: { type: 'string' } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'view', in: 'query', schema: { type: 'string', enum: ['all', 'my', 'unassigned'] } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        ],
        responses: { 200: { description: 'List of tickets' } },
      },
      post: {
        summary: 'Create a new support ticket',
        tags: ['Tickets'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['subject', 'description', 'category'],
                properties: {
                  subject: { type: 'string', example: 'Unable to connect to database' },
                  description: { type: 'string', example: 'Receiving connection timeout errors since 10am.' },
                  category: { type: 'string', example: 'Technical Support' },
                  priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Ticket created with human readable TKT number' } },
      },
    },
    '/api/tickets/{ticketId}': {
      get: {
        summary: 'Get ticket details by ID or ticketNumber',
        tags: ['Tickets'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'ticketId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Ticket details' }, 404: { description: 'Not found' } },
      },
      patch: {
        summary: 'Update ticket metadata (category, priority, status)',
        tags: ['Tickets'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'ticketId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Metadata updated' } },
      },
    },
    '/api/tickets/{ticketId}/messages': {
      get: {
        summary: 'Get conversation messages for ticket (internal notes hidden from customers)',
        tags: ['Tickets'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'ticketId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Ticket messages' } },
      },
      post: {
        summary: 'Post reply or internal note to ticket',
        tags: ['Tickets'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'ticketId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['body'],
                properties: {
                  body: { type: 'string', example: 'We have applied the configuration fix.' },
                  type: { type: 'string', enum: ['public', 'internal'], default: 'public' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Message created' } },
      },
    },
    '/api/tickets/{ticketId}/assign': {
      post: {
        summary: 'Assign or reassign ticket to an Agent or Admin',
        tags: ['Tickets'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'ticketId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['agentId'],
                properties: { agentId: { type: 'string' } },
              },
            },
          },
        },
        responses: { 200: { description: 'Ticket assigned' } },
      },
    },
    '/api/tickets/{ticketId}/resolve': {
      post: {
        summary: 'Mark ticket as resolved',
        tags: ['Tickets'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'ticketId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Ticket resolved' } },
      },
    },
    '/api/tickets/{ticketId}/reopen': {
      post: {
        summary: 'Reopen a closed or resolved ticket',
        tags: ['Tickets'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'ticketId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Ticket reopened' } },
      },
    },
    '/api/tickets/{ticketId}/close': {
      post: {
        summary: 'Close a ticket',
        tags: ['Tickets'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'ticketId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Ticket closed' } },
      },
    },
    '/api/tickets/{ticketId}/activity': {
      get: {
        summary: 'Get chronological activity and audit history for ticket',
        tags: ['Tickets'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'ticketId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Ticket activity timeline' } },
      },
    },
    '/api/categories': {
      get: {
        summary: 'List active ticket categories',
        tags: ['Categories'],
        responses: { 200: { description: 'Categories list' } },
      },
      post: {
        summary: 'Create custom ticket category (Admin only)',
        tags: ['Categories'],
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: 'Category created' } },
      },
    },
    '/api/dashboard/summary': {
      get: {
        summary: 'Get dashboard statistics, counts, charts data and recent activities',
        tags: ['Dashboard'],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Dashboard metrics' } },
      },
    },
    '/api/email/inbound': {
      post: {
        summary: 'Inbound email provider webhook endpoint',
        tags: ['Email'],
        description: 'Processes incoming email replies from the requester or currently assigned agent, parses headers/thread, strips quotes, reopens tickets if resolved, stores messages, notifies the other participant, and broadcasts the conversation update over Socket.IO.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['from', 'subject'],
                properties: {
                  from: { type: 'string', example: 'alice@example.com' },
                  to: { type: 'string', example: 'support+TKT-2026-000001@bitmax.local' },
                  subject: { type: 'string', example: 'Re: [TKT-2026-000001] Unable to connect to database' },
                  body: { type: 'string', example: 'Thank you, this is now resolved!' },
                  messageId: { type: 'string', example: '<unique-msg-id-123@client.com>' },
                  headers: { type: 'object' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Inbound email processed and appended to ticket thread' },
          400: { description: 'Processing failed or duplicate message' },
        },
      },
    },
  },
};
