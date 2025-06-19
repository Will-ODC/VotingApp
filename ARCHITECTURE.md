# VotingApp - Clean Architecture Design

## Overview

This document outlines the refactored architecture following Domain-Driven Design (DDD) principles, Clean Architecture, and SOLID principles.

## Architecture Layers

### 1. Domain Layer (Core Business Logic)
- **Purpose**: Contains core business entities, value objects, and domain services
- **Dependencies**: None (pure business logic)
- **Location**: `src/domain/`

#### Key Components:
- **Entities**: User, Poll, Vote, Option
- **Value Objects**: Email, Password, VoteChoice
- **Domain Services**: VoteThresholdService, PollExpirationService
- **Domain Events**: PollCreated, VoteSubmitted, ThresholdReached
- **Interfaces**: Repository contracts, service contracts

### 2. Application Layer (Use Cases)
- **Purpose**: Orchestrates domain objects to fulfill use cases
- **Dependencies**: Domain layer only
- **Location**: `src/application/`

#### Key Components:
- **Use Cases**: CreatePollUseCase, SubmitVoteUseCase, RegisterUserUseCase
- **DTOs**: Request/Response objects for use cases
- **Application Services**: Coordinate between domain services
- **Interfaces**: External service contracts (notifications, file storage)

### 3. Infrastructure Layer (External Concerns)
- **Purpose**: Implements interfaces defined by domain/application layers
- **Dependencies**: Domain and Application layers
- **Location**: `src/infrastructure/`

#### Key Components:
- **Repositories**: PostgreSQL implementations of repository interfaces
- **External Services**: File storage (email handled via simple mailto links)
- **Database**: Connection management, migrations
- **Security**: Password hashing, session management

### 4. Presentation Layer (User Interface)
- **Purpose**: Handles HTTP requests and responses
- **Dependencies**: Application layer only
- **Location**: `src/presentation/`

#### Key Components:
- **Controllers**: Thin controllers that delegate to use cases
- **Middleware**: Authentication, validation, error handling
- **View Models**: Data transformation for views
- **Routes**: HTTP route definitions

## Design Patterns Applied

### 1. Repository Pattern
```javascript
// Domain layer defines interface
interface IPollRepository {
  findById(id: string): Promise<Poll>;
  save(poll: Poll): Promise<Poll>;
  findActive(): Promise<Poll[]>;
}

// Infrastructure layer implements
class PostgresPollRepository implements IPollRepository {
  // Implementation details hidden from domain
}
```

### 2. Use Case Pattern
```javascript
class CreatePollUseCase {
  constructor(
    private pollRepository: IPollRepository,
    private eventBus: IEventBus
  ) {}
  
  async execute(request: CreatePollRequest): Promise<CreatePollResponse> {
    // Orchestrate domain objects
  }
}
```

### 3. Dependency Injection
```javascript
// Composition root wires dependencies
const container = new Container();
container.register(IPollRepository, PostgresPollRepository);
container.register(CreatePollUseCase);
```

## SOLID Principles Implementation

### Single Responsibility Principle
- Each class has one reason to change
- Poll entity handles poll business logic only
- PollRepository handles data persistence only
- PollController handles HTTP concerns only

### Open/Closed Principle
- New voting methods can be added without modifying existing code
- Strategy pattern for different vote counting algorithms
- Plugin architecture for notifications

### Liskov Substitution Principle
- All repository implementations are interchangeable
- Mock implementations for testing
- Database can be swapped without affecting business logic

### Interface Segregation Principle
- Separate interfaces for reading and writing
- IReadablePollRepository vs IWritablePollRepository
- Clients depend only on methods they use

### Dependency Inversion Principle
- High-level modules don't depend on low-level modules
- Both depend on abstractions (interfaces)
- Business logic doesn't know about PostgreSQL

## Project Structure

```
VotingApp/
├── src/
│   ├── domain/                    # Core business logic
│   │   ├── entities/
│   │   │   ├── User.js
│   │   │   ├── Poll.js
│   │   │   ├── Vote.js
│   │   │   └── Option.js
│   │   ├── value-objects/
│   │   │   ├── Email.js
│   │   │   ├── Password.js
│   │   │   └── VoteChoice.js
│   │   ├── services/
│   │   │   ├── VoteThresholdService.js
│   │   │   └── PollExpirationService.js
│   │   ├── events/
│   │   │   ├── PollCreatedEvent.js
│   │   │   └── VoteSubmittedEvent.js
│   │   ├── interfaces/
│   │   │   ├── IPollRepository.js
│   │   │   ├── IUserRepository.js
│   │   │   └── IVoteRepository.js
│   │   └── exceptions/
│   │       ├── DomainException.js
│   │       └── ValidationException.js
│   │
│   ├── application/               # Use cases / Application services
│   │   ├── use-cases/
│   │   │   ├── polls/
│   │   │   │   ├── CreatePollUseCase.js
│   │   │   │   ├── VoteOnPollUseCase.js
│   │   │   │   └── GetPollResultsUseCase.js
│   │   │   ├── users/
│   │   │   │   ├── RegisterUserUseCase.js
│   │   │   │   ├── LoginUserUseCase.js
│   │   │   │   └── ChangePasswordUseCase.js
│   │   │   └── admin/
│   │   │       └── DeletePollUseCase.js
│   │   ├── dtos/
│   │   │   ├── CreatePollRequest.js
│   │   │   ├── CreatePollResponse.js
│   │   │   └── ...
│   │   ├── interfaces/
│   │   │   └── INotificationService.js
│   │   └── validators/
│   │       ├── PollValidator.js
│   │       └── UserValidator.js
│   │
│   ├── infrastructure/            # External implementations
│   │   ├── database/
│   │   │   ├── PostgresConnection.js
│   │   │   ├── migrations/
│   │   │   └── repositories/
│   │   │       ├── PostgresPollRepository.js
│   │   │       ├── PostgresUserRepository.js
│   │   │       └── PostgresVoteRepository.js
│   │   ├── security/
│   │   │   ├── BcryptPasswordHasher.js
│   │   │   └── SessionManager.js
│   │   ├── services/
│   │   │   └── ConsoleNotificationService.js
│   │   └── config/
│   │       ├── database.config.js
│   │       └── app.config.js
│   │
│   ├── presentation/              # Web layer
│   │   ├── controllers/
│   │   │   ├── PollController.js
│   │   │   ├── AuthController.js
│   │   │   └── ProfileController.js
│   │   ├── middleware/
│   │   │   ├── AuthenticationMiddleware.js
│   │   │   ├── ValidationMiddleware.js
│   │   │   └── ErrorHandlingMiddleware.js
│   │   ├── routes/
│   │   │   ├── pollRoutes.js
│   │   │   ├── authRoutes.js
│   │   │   └── profileRoutes.js
│   │   └── view-models/
│   │       ├── PollViewModel.js
│   │       └── UserViewModel.js
│   │
│   └── composition-root/          # Dependency injection setup
│       ├── Container.js
│       └── index.js
│
├── tests/
│   ├── unit/
│   │   ├── domain/
│   │   └── application/
│   ├── integration/
│   └── e2e/
│
├── views/                         # EJS templates (unchanged)
├── public/                        # Static assets (unchanged)
└── server.js                      # Application entry point
```

## Benefits of This Architecture

### 1. Testability
- Business logic can be tested without database
- Use cases can be tested with mock repositories
- Fast unit tests for core logic

### 2. Maintainability
- Clear separation of concerns
- Easy to locate and modify specific functionality
- Reduced coupling between components

### 3. Flexibility
- Easy to swap database (PostgreSQL to MongoDB)
- Can add new features without modifying existing code
- Support for multiple presentation layers (Web, API, CLI)

### 4. Scalability
- Can extract microservices along bounded contexts
- Easy to add caching layer
- Support for event-driven architecture

## Migration Strategy

### Phase 1: Create New Structure
1. Set up new directory structure
2. Create domain entities
3. Define repository interfaces
4. Implement basic use cases

### Phase 2: Parallel Implementation
1. Keep existing code running
2. Implement new features in clean architecture
3. Gradually migrate existing features

### Phase 3: Complete Migration
1. Remove old code
2. Update all routes to use new controllers
3. Remove direct database access from routes

### Phase 4: Enhancement
1. Add comprehensive testing
2. Implement advanced patterns (CQRS, Event Sourcing)
3. Add monitoring and logging

## Configuration Management

### Environment Variables
```javascript
// src/infrastructure/config/app.config.js
module.exports = {
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    // ...
  },
  business: {
    defaultPollDuration: process.env.DEFAULT_POLL_DURATION || 30,
    minPasswordLength: process.env.MIN_PASSWORD_LENGTH || 6,
    paginationSize: process.env.PAGINATION_SIZE || 10,
  },
  // ...
};
```

## Error Handling Strategy

### Custom Exceptions
```javascript
// Domain exceptions
class PollExpiredException extends DomainException {}
class InsufficientVotesException extends DomainException {}

// Application exceptions
class UserNotFoundException extends ApplicationException {}
class DuplicateEmailException extends ApplicationException {}

// Infrastructure exceptions
class DatabaseConnectionException extends InfrastructureException {}
```

### Global Error Handler
```javascript
// Presentation layer error middleware
app.use((error, req, res, next) => {
  if (error instanceof DomainException) {
    // Handle domain errors
  } else if (error instanceof ApplicationException) {
    // Handle application errors
  } else {
    // Handle unexpected errors
  }
});
```

## Next Steps

1. Begin implementation with domain entities
2. Create repository interfaces
3. Implement first use case (CreatePoll)
4. Set up dependency injection
5. Migrate first route to new architecture