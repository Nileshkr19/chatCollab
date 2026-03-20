class apiResponse {
  constructor(statusCode, data, message = "success") {
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.success = statusCode >= 200 && statusCode < 300;
  }
}

export default apiResponse;
