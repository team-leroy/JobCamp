# Testing Guide for JobCamp

## 🧪 **Testing Setup**

JobCamp uses **Vitest** as the testing framework with **@testing-library/svelte** for component testing.

### **Quick Start**

```bash
# Run all tests
pnpm test:run

# Run tests in watch mode
pnpm test

# Run tests with UI
pnpm test:ui
```

## 📁 **Test Structure**

```
src/
├── lib/
│   ├── server/
│   │   └── lottery.test.ts          # Lottery algorithm tests
│   └── components/
│       └── admin/
│           └── LotteryConfigurationWidget.test.ts  # Component tests
├── routes/
│   └── lottery/
│       └── +page.server.test.ts     # Server action tests
└── test/
    └── setup.ts                     # Global test setup
```

## 🎯 **Test Categories**

### **1. Lottery Algorithm Tests** (`src/lib/server/lottery.test.ts`)
- ✅ Manual assignment application
- ✅ Prefill settings calculation
- ✅ Grade order sorting (ascending/descending)
- ✅ Empty configuration handling
- ✅ Data structure validation

### **2. Component Tests** (`src/lib/components/admin/LotteryConfigurationWidget.test.ts`)
- ✅ Student name formatting
- ✅ Position name formatting
- ✅ Configuration structure validation
- ✅ Grade order validation
- ✅ Data structure validation
- ✅ Summary statistics calculation

### **3. Server Action Tests** (`src/routes/lottery/+page.server.test.ts`)
- ✅ Manual assignment creation/removal
- ✅ Prefill setting creation/removal
- ✅ Lottery execution with grade order
- ✅ Form data validation
- ✅ Database query mocking

## 🔧 **Testing Configuration**

### **Vitest Config** (`vitest.config.ts`)
```typescript
export default defineConfig({
  plugins: [sveltekit()],
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}'],
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    globals: true
  }
});
```

### **Test Setup** (`src/test/setup.ts`)
- Prisma client mocking
- Environment variable mocking
- Global test utilities

## 🎲 **Lottery Testing Strategy**

### **Algorithm Testing**
```typescript
describe('runLotteryWithSeed', () => {
  it('should apply manual assignments first', () => {
    // Test assignment priority
  });
  
  it('should apply prefill settings correctly', () => {
    // Test prefill calculations
  });
  
  it('should sort students by grade when specified', () => {
    // Test grade ordering
  });
});
```

### **Configuration Testing**
```typescript
describe('Lottery Configuration', () => {
  it('should create default configuration with NONE grade order', () => {
    // Test default values
  });
  
  it('should validate grade order values', () => {
    // Test valid/invalid inputs
  });
});
```

### **Component Testing**
```typescript
describe('LotteryConfigurationWidget', () => {
  it('should format student names correctly', () => {
    // Test UI formatting
  });
  
  it('should validate data structures', () => {
    // Test prop validation
  });
});
```

## 🚀 **Running Tests**

### **All Tests**
```bash
pnpm test:run
```

### **Specific Test File**
```bash
pnpm test src/lib/server/lottery.test.ts
```

### **Watch Mode**
```bash
pnpm test
```

### **UI Mode**
```bash
pnpm test:ui
```

## 📊 **Test Coverage**

Current test coverage includes:

- **Lottery Algorithm**: 11 tests
- **Component Logic**: 11 tests  
- **Server Actions**: 12 tests
- **Total**: 34 tests

### **Coverage Areas**
- ✅ Manual assignment functionality
- ✅ Prefill settings (0-100%)
- ✅ Grade order configuration
- ✅ Data validation
- ✅ Error handling
- ✅ UI component logic
- ✅ Server action validation

## 🔍 **Mocking Strategy**

### **Prisma Client**
```typescript
vi.mock('$lib/server/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    student: { findMany: vi.fn() },
    position: { findMany: vi.fn() },
    // ... other models
  }
}));
```

### **SvelteKit Functions**
```typescript
vi.mock('$app/forms', () => ({
  enhance: vi.fn()
}));
```

## 🎯 **Best Practices**

1. **Test Business Logic**: Focus on algorithm correctness
2. **Mock External Dependencies**: Database, API calls
3. **Validate Data Structures**: Ensure proper object shapes
4. **Test Edge Cases**: Empty data, invalid inputs
5. **Component Testing**: Test logic, not rendering (Svelte 5 compatibility)

## 🔄 **Adding New Tests**

### **For New Features**
1. Create test file: `src/path/to/feature.test.ts`
2. Import necessary modules and mocks
3. Write descriptive test cases
4. Run tests: `pnpm test:run`

### **Test Naming Convention**
```typescript
describe('FeatureName', () => {
  it('should do something when condition', () => {
    // Test implementation
  });
});
```

## 🐛 **Troubleshooting**

### **Svelte 5 Compatibility**
- Component tests use logic testing instead of rendering
- Mock components to avoid lifecycle issues
- Test business logic directly

### **Prisma Mocking**
- Mock all Prisma client methods used
- Use `vi.mocked()` for type safety
- Reset mocks in `beforeEach()`

### **Test Environment**
- Ensure `jsdom` environment is set
- Mock browser APIs if needed
- Use `vitest` globals for convenience 