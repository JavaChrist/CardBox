declare module 'quagga' {
  interface QuaggaConfig {
    src?: HTMLCanvasElement | HTMLImageElement | string;
    numOfWorkers?: number;
    inputStream?: {
      size?: number;
      name?: string;
      type?: string;
    };
    locator?: {
      patchSize?: 'small' | 'medium' | 'large';
      halfSample?: boolean;
    };
    decoder?: {
      readers?: string[];
    };
  }

  interface CodeResult {
    code: string;
    format: string;
  }

  interface Result {
    codeResult?: CodeResult;
  }

  namespace Quagga {
    function decodeSingle(
      config: QuaggaConfig,
      callback: (result: Result | null) => void
    ): void;
  }

  export = Quagga;
} 