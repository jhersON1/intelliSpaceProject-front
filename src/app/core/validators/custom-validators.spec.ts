import { FormControl, FormGroup } from '@angular/forms';
import { CustomValidators } from './custom-validators';

describe('CustomValidators', () => {

  describe('productCode', () => {
    let validator: any;

    beforeEach(() => {
      validator = CustomValidators.productCode();
    });

    it('should return null for valid product codes', () => {
      const validCodes = ['AB-1234', 'XYZ-123456', 'AA-1234', 'BBB-123456'];
      
      validCodes.forEach(code => {
        const control = new FormControl(code);
        const result = validator(control);
        expect(result).toBeNull();
      });
    });

    it('should return null for empty values', () => {
      const control = new FormControl('');
      const result = validator(control);
      expect(result).toBeNull();
    });

    it('should return null for null values', () => {
      const control = new FormControl(null);
      const result = validator(control);
      expect(result).toBeNull();
    });

    it('should return error for invalid product codes', () => {
      const invalidCodes = [
        'A-123',        // Solo una letra
        'ABCD-123',     // Más de 3 letras
        'AB-123',       // Menos de 4 números
        'AB-1234567',   // Más de 6 números
        'ab-1234',      // Minúsculas
        'AB1234',       // Sin guión
        '12-1234'       // Números en lugar de letras
      ];
      
      invalidCodes.forEach(code => {
        const control = new FormControl(code);
        const result = validator(control);
        expect(result).toEqual({
          productCode: { 
            value: code, 
            pattern: 'XX-0000 o XXX-000000' 
          }
        });
      });
    });
  });

  describe('positivePrice', () => {
    let validator: any;

    beforeEach(() => {
      validator = CustomValidators.positivePrice();
    });

    it('should return null for positive numbers', () => {
      const validPrices = ['10', '0.01', '100.50', '999.99'];
      
      validPrices.forEach(price => {
        const control = new FormControl(price);
        const result = validator(control);
        expect(result).toBeNull();
      });
    });

    it('should return null for empty values', () => {
      const control = new FormControl('');
      const result = validator(control);
      expect(result).toBeNull();
    });

    it('should return null for null values', () => {
      const control = new FormControl(null);
      const result = validator(control);
      expect(result).toBeNull();
    });

    it('should return error for zero or negative numbers', () => {
      const invalidPrices = ['0', '-1', '-100.50'];
      
      invalidPrices.forEach(price => {
        const control = new FormControl(price);
        const result = validator(control);
        expect(result).toEqual({
          positivePrice: { value: price }
        });
      });
    });    it('should return error for non-numeric values', () => {
      const invalidPrices = ['abc', 'ten', 'not-a-number'];
      
      invalidPrices.forEach(price => {
        const control = new FormControl(price);
        const result = validator(control);
        expect(result).toEqual({
          positivePrice: { value: price }
        });
      });
    });
  });

  describe('url', () => {
    let validator: any;

    beforeEach(() => {
      validator = CustomValidators.url();
    });    it('should return null for valid URLs', () => {
      const validUrls = [
        'https://www.example.com',
        'http://example.com',
        'https://subdomain.example.com/path',
        'ftp://files.example.com',
        'https://example.com:8080/path?query=value'
      ];
      
      validUrls.forEach(url => {
        const control = new FormControl(url);
        const result = validator(control);
        expect(result).toBeNull();
      });
    });

    it('should return null for empty values', () => {
      const control = new FormControl('');
      const result = validator(control);
      expect(result).toBeNull();
    });

    it('should return null for whitespace-only values', () => {
      const control = new FormControl('   ');
      const result = validator(control);
      expect(result).toBeNull();
    });    it('should return null for null values', () => {
      const control = new FormControl(null);
      const result = validator(control);
      expect(result).toBeNull();
    });
  });

  describe('minWords', () => {
    let validator: any;

    beforeEach(() => {
      validator = CustomValidators.minWords(3);
    });

    it('should return null for text with minimum required words', () => {
      const validTexts = [
        'This has three words',
        'This has more than three words exactly',
        'One two three',
        'Multiple    spaces    between    words'
      ];
      
      validTexts.forEach(text => {
        const control = new FormControl(text);
        const result = validator(control);
        expect(result).toBeNull();
      });
    });

    it('should return null for empty values', () => {
      const control = new FormControl('');
      const result = validator(control);
      expect(result).toBeNull();
    });

    it('should return null for whitespace-only values', () => {
      const control = new FormControl('   ');
      const result = validator(control);
      expect(result).toBeNull();
    });

    it('should return null for null values', () => {
      const control = new FormControl(null);
      const result = validator(control);
      expect(result).toBeNull();
    });

    it('should return error for text with fewer than minimum words', () => {
      const invalidTexts = [
        'One word',
        'Two words',
        'A',
        '  single  '
      ];
      
      invalidTexts.forEach(text => {
        const control = new FormControl(text);
        const result = validator(control);
        const wordCount = text.trim().split(/\s+/).length;
        expect(result).toEqual({
          minWords: { 
            actualWords: wordCount, 
            requiredWords: 3 
          }
        });
      });
    });

    it('should work with different minimum word counts', () => {
      const validator5Words = CustomValidators.minWords(5);
      const control = new FormControl('Only four words here');
      const result = validator5Words(control);
      
      expect(result).toEqual({
        minWords: { 
          actualWords: 4, 
          requiredWords: 5 
        }
      });
    });
  });

  describe('fileValidator', () => {
    let validator: any;

    beforeEach(() => {
      validator = CustomValidators.fileValidator(100, ['image/jpeg', 'image/png']);
    });

    it('should return null for valid files', () => {
      const validFile = new File(['content'], 'test.jpg', { 
        type: 'image/jpeg',
        lastModified: Date.now()
      });
      
      // Mock file size to be within limits
      Object.defineProperty(validFile, 'size', { value: 50 * 1024, writable: false });
      
      const control = new FormControl(validFile);
      const result = validator(control);
      expect(result).toBeNull();
    });

    it('should return null for null values', () => {
      const control = new FormControl(null);
      const result = validator(control);
      expect(result).toBeNull();
    });

    it('should return error for files exceeding size limit', () => {
      const largeFile = new File(['content'], 'large.jpg', { 
        type: 'image/jpeg',
        lastModified: Date.now()
      });
      
      Object.defineProperty(largeFile, 'size', { value: 200 * 1024, writable: false });
      
      const control = new FormControl(largeFile);
      const result = validator(control);
      
      expect(result).toEqual({
        fileSize: {
          actualSize: 200,
          maxSize: 100
        }
      });
    });

    it('should return error for files with invalid type', () => {
      const invalidFile = new File(['content'], 'test.pdf', { 
        type: 'application/pdf',
        lastModified: Date.now()
      });
      
      Object.defineProperty(invalidFile, 'size', { value: 50 * 1024, writable: false });
      
      const control = new FormControl(invalidFile);
      const result = validator(control);
      
      expect(result).toEqual({
        fileType: {
          actualType: 'application/pdf',
          allowedTypes: ['image/jpeg', 'image/png']
        }
      });
    });

    it('should return multiple errors for files with both size and type issues', () => {
      const invalidFile = new File(['content'], 'large.pdf', { 
        type: 'application/pdf',
        lastModified: Date.now()
      });
      
      Object.defineProperty(invalidFile, 'size', { value: 200 * 1024, writable: false });
      
      const control = new FormControl(invalidFile);
      const result = validator(control);
      
      expect(result).toEqual({
        fileSize: {
          actualSize: 200,
          maxSize: 100
        },
        fileType: {
          actualType: 'application/pdf',
          allowedTypes: ['image/jpeg', 'image/png']
        }
      });
    });
  });

  describe('matchField', () => {
    let validator: any;

    beforeEach(() => {
      validator = CustomValidators.matchField('password');
    });    it('should return null when fields match', () => {
      const formGroup = new FormGroup({
        password: new FormControl('password123'),
        confirmPassword: new FormControl('password123')
      });
      
      const result = validator(formGroup.get('confirmPassword'));
      expect(result).toBeNull();
    });

    it('should return null when parent is not available', () => {
      const control = new FormControl('password123');
      const result = validator(control);
      expect(result).toBeNull();
    });

    it('should return null when match control is not found', () => {
      const formGroup = new FormGroup({
        confirmPassword: new FormControl('password123')
      });
      
      const result = validator(formGroup.get('confirmPassword'));
      expect(result).toBeNull();
    });

    it('should return error when fields do not match', () => {
      const formGroup = new FormGroup({
        password: new FormControl('password123'),
        confirmPassword: new FormControl('different_password')
      });
      
      const result = validator(formGroup.get('confirmPassword'));
      expect(result).toEqual({
        matchField: { fieldName: 'password' }
      });
    });
  });

  describe('asyncAvailabilityValidator', () => {
    let mockCheckFn: jasmine.Spy;
    let validator: any;

    beforeEach(() => {
      mockCheckFn = jasmine.createSpy('checkFn');
      validator = CustomValidators.asyncAvailabilityValidator(mockCheckFn, 100);
    });

    it('should return null for empty values', async () => {
      const control = new FormControl('');
      const result = await validator(control);
      expect(result).toBeNull();
    });    it('should return null when value is available', (done) => {
      mockCheckFn.and.returnValue(Promise.resolve(true));
      
      const control = new FormControl('available_value');
      
      validator(control).then((result: any) => {
        expect(result).toBeNull();
        expect(mockCheckFn).toHaveBeenCalledWith('available_value');
        done();
      });
    });

    it('should return error when value is not available', (done) => {
      mockCheckFn.and.returnValue(Promise.resolve(false));
      
      const control = new FormControl('taken_value');
      
      validator(control).then((result: any) => {
        expect(result).toEqual({
          notAvailable: { value: 'taken_value' }
        });
        expect(mockCheckFn).toHaveBeenCalledWith('taken_value');
        done();      });
    });

    it('should debounce multiple calls', (done) => {
      mockCheckFn.and.returnValue(Promise.resolve(true));
      
      const control = new FormControl('test1');
      validator(control);
      
      control.setValue('test2');
      validator(control);
      
      control.setValue('test3');
      validator(control).then((result: any) => {
        expect(result).toBeNull();
        expect(mockCheckFn).toHaveBeenCalledTimes(1);
        expect(mockCheckFn).toHaveBeenCalledWith('test3');
        done();
      });
    });
  });
});
