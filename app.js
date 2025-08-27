class ImageEditor {
    constructor() {
        this.fileInput = document.getElementById('fileInput');
        this.uploadZone = document.getElementById('uploadZone');
        this.originalImage = document.getElementById('originalImage');
        this.canvas = document.getElementById('canvas');
        this.uploadSection = document.getElementById('uploadSection');
        this.editorSection = document.getElementById('editorSection');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.applyBtn = document.getElementById('applyBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.newImageBtn = document.getElementById('newImageBtn');
        this.showRawBtn = document.getElementById('showRawBtn');
        this.customInstruction = document.getElementById('customInstruction');
        this.rawResponseModal = document.getElementById('rawResponseModal');
        this.closeModal = document.getElementById('closeModal');
        this.rawResponseContent = document.getElementById('rawResponseContent');
        this.copyRawBtn = document.getElementById('copyRawBtn');
        
        this.currentImageData = null;
        this.lastRawResponse = null;
        
        this.init();
    }
    
    init() {
        this.uploadZone.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        this.uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.uploadZone.style.background = 'rgba(255, 255, 255, 0.2)';
        });
        this.uploadZone.addEventListener('dragleave', () => {
            this.uploadZone.style.background = 'rgba(255, 255, 255, 0.1)';
        });
        this.uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uploadZone.style.background = 'rgba(255, 255, 255, 0.1)';
            this.handleFileUpload({ target: { files: e.dataTransfer.files } });
        });
        
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.customInstruction.value = btn.dataset.instruction;
                this.applyEffect(btn.dataset.instruction);
            });
        });
        
        this.applyBtn.addEventListener('click', () => {
            const instruction = this.customInstruction.value.trim();
            if (instruction) {
                this.applyEffect(instruction);
            } else {
                alert('Please enter an instruction or select a preset filter');
            }
        });
        
        this.downloadBtn.addEventListener('click', () => this.downloadImage());
        this.newImageBtn.addEventListener('click', () => this.reset());
        this.showRawBtn.addEventListener('click', () => this.showRawResponse());
        this.closeModal.addEventListener('click', () => this.rawResponseModal.style.display = 'none');
        this.copyRawBtn.addEventListener('click', () => this.copyRawResponse());
        
        window.addEventListener('click', (e) => {
            if (e.target === this.rawResponseModal) {
                this.rawResponseModal.style.display = 'none';
            }
        });
    }
    
    handleFileUpload(e) {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.originalImage.src = e.target.result;
                this.currentImageData = e.target.result;
                this.uploadSection.style.display = 'none';
                this.editorSection.style.display = 'flex';
            };
            reader.readAsDataURL(file);
        }
    }
    
    async applyEffect(instruction) {
        if (!this.currentImageData) return;
        
        this.showLoading(true);
        
        try {
            const response = await fetch({process.env.url}, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    photoDataUri: this.currentImageData,
                    instructions: instruction
                })
            });
            
            const data = await response.json();
            
            if (data.editedPhotoDataUri || data.editedImageUri) {
                let editedImageUri = data.editedPhotoDataUri || data.editedImageUri;
                
                // Handle base64 response
                if (typeof editedImageUri === 'string') {
                    editedImageUri = editedImageUri.trim();
                    
                    if (!editedImageUri.startsWith('data:image')) {
                        if (editedImageUri.startsWith('base64,')) {
                            editedImageUri = 'data:image/jpeg;' + editedImageUri;
                        } else if (!editedImageUri.startsWith('data:')) {
                            editedImageUri = 'data:image/jpeg;base64,' + editedImageUri;
                        }
                    }
                    
                    const img = new Image();
                    img.onload = () => {
                        this.originalImage.src = img.src;
                        this.currentImageData = img.src;
                        this.downloadBtn.style.display = 'block';
                        this.showRawBtn.style.display = 'block';
                        this.lastRawResponse = data;
                    };
                    img.onerror = () => {
                        console.error('Failed to load image from base64');
                        alert('Failed to process the image response');
                    };
                    img.src = editedImageUri;
                } else {
                    throw new Error('Invalid image data format');
                }
            } else {
                throw new Error('No edited image received. Response: ' + JSON.stringify(data));
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error processing image: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }
    
    showLoading(show) {
        this.loadingOverlay.style.display = show ? 'flex' : 'none';
    }
    
    downloadImage() {
        if (!this.currentImageData) return;
        
        const link = document.createElement('a');
        link.href = this.currentImageData;
        link.download = 'edited-image.png';
        link.click();
    }
    
    reset() {
        this.uploadSection.style.display = 'flex';
        this.editorSection.style.display = 'none';
        this.originalImage.src = '';
        this.currentImageData = null;
        this.customInstruction.value = '';
        this.downloadBtn.style.display = 'none';
        this.showRawBtn.style.display = 'none';
        this.lastRawResponse = null;
    }
    
    showRawResponse() {
        if (this.lastRawResponse) {
            this.rawResponseContent.textContent = JSON.stringify(this.lastRawResponse, null, 2);
            this.rawResponseModal.style.display = 'flex';
        }
    }
    
    async copyRawResponse() {
        try {
            await navigator.clipboard.writeText(JSON.stringify(this.lastRawResponse, null, 2));
            this.copyRawBtn.textContent = 'Copied!';
            setTimeout(() => {
                this.copyRawBtn.textContent = 'Copy to Clipboard';
            }, 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }
}

new ImageEditor();

