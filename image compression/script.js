document.addEventListener('DOMContentLoaded', function() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.querySelector('.upload-btn');
    const previewSection = document.querySelector('.preview-section');
    const originalImage = document.getElementById('originalImage');
    const compressedImage = document.getElementById('compressedImage');
    const originalSize = document.getElementById('originalSize');
    const compressedSize = document.getElementById('compressedSize');
    const qualitySlider = document.getElementById('quality');
    const qualityValue = document.getElementById('qualityValue');
    const downloadBtn = document.getElementById('downloadBtn');

    let currentFile = null;
    let compressionMode = 'balanced'; // 可选值: 'balanced', 'quality', 'size'

    // 图片预览相关元素
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const modalClose = document.querySelector('.modal-close');

    // 上传按钮点击事件
    uploadBtn.addEventListener('click', () => fileInput.click());

    // 文件选择事件
    fileInput.addEventListener('change', handleFileSelect);

    // 拖拽事件
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#007AFF';
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#DEDEDE';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#DEDEDE';
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });

    // 质量滑块事件
    qualitySlider.addEventListener('input', function() {
        qualityValue.textContent = this.value + '%';
        if (currentFile) {
            compressImage(currentFile, this.value / 100);
        }
    });

    // 下载按钮事件
    downloadBtn.addEventListener('click', () => {
        const link = document.createElement('a');
        link.download = 'compressed_' + currentFile.name;
        link.href = compressedImage.src;
        link.click();
    });

    function handleFileSelect(e) {
        const file = e.target.files[0];
        handleFile(file);
    }

    function handleFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('请选择片文件！');
            return;
        }

        currentFile = file;
        originalSize.textContent = formatFileSize(file.size);
        
        const reader = new FileReader();
        reader.onload = function(e) {
            originalImage.src = e.target.result;
            compressImage(file, qualitySlider.value / 100);
            previewSection.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }

    function compressImage(file, quality) {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // 根据压缩模式计算尺寸和质量
            let targetWidth = img.width;
            let targetHeight = img.height;
            let targetQuality = quality;
            
            switch(compressionMode) {
                case 'quality':
                    // 保持原始尺寸,仅压缩质量
                    targetQuality = Math.max(quality, 0.7);
                    break;
                case 'size':
                    // 降低尺寸和质量以获得最大压缩率
                    const maxDimension = 1600;
                    if(img.width > maxDimension || img.height > maxDimension) {
                        const ratio = Math.min(maxDimension / img.width, maxDimension / img.height);
                        targetWidth = Math.floor(img.width * ratio);
                        targetHeight = Math.floor(img.height * ratio);
                    }
                    targetQuality = Math.min(quality, 0.6);
                    break;
                default: // balanced
                    // 平衡模式
                    const maxBalancedDimension = 2048;
                    if(img.width > maxBalancedDimension || img.height > maxBalancedDimension) {
                        const ratio = Math.min(maxBalancedDimension / img.width, maxBalancedDimension / img.height);
                        targetWidth = Math.floor(img.width * ratio);
                        targetHeight = Math.floor(img.height * ratio);
                    }
                    targetQuality = Math.max(quality, 0.5);
            }

            canvas.width = targetWidth;
            canvas.height = targetHeight;

            // 使用双线性插值算法进行缩放
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            // 绘制图像
            ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

            // 对于PNG图片尝试进一步优化
            if(file.type === 'image/png') {
                // 检查是否可以转换为JPEG以获得更好的压缩率
                const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
                const hasTransparency = hasTransparentPixels(imageData);
                
                if(!hasTransparency) {
                    canvas.toBlob(
                        (blob) => {
                            compressedImage.src = URL.createObjectURL(blob);
                            compressedSize.textContent = formatFileSize(blob.size);
                        },
                        'image/jpeg',
                        targetQuality
                    );
                    return;
                }
            }

            // 默认压缩
            canvas.toBlob(
                (blob) => {
                    compressedImage.src = URL.createObjectURL(blob);
                    compressedSize.textContent = formatFileSize(blob.size);
                },
                file.type,
                targetQuality
            );
        };
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // 检查图像是否包含透明像素
    function hasTransparentPixels(imageData) {
        const data = imageData.data;
        for(let i = 3; i < data.length; i += 4) {
            if(data[i] < 255) return true;
        }
        return false;
    }

    // 添加压缩模式切换按钮的事件处理
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            compressionMode = this.dataset.mode;
            if(currentFile) {
                compressImage(currentFile, qualitySlider.value / 100);
            }
        });
    });

    // 为原始图片和压缩后图片添加点击预览功能
    originalImage.addEventListener('click', function() {
        showModal(this.src);
    });

    compressedImage.addEventListener('click', function() {
        showModal(this.src);
    });

    // 点击关闭按钮关闭模态框
    modalClose.addEventListener('click', function(e) {
        e.stopPropagation(); // 阻止事件冒泡
        modal.style.display = 'none';
    });

    // 点击模态框背景关闭
    modal.addEventListener('click', function(e) {
        if (e.target === this) {
            this.style.display = 'none';
        }
    });

    // 显示模态框时禁止页面滚动
    function showModal(src) {
        modalImage.src = src;
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    // 关闭模态框时恢复页面滚动
    function closeModal() {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }

    // 修改键盘事件
    document.addEventListener('keydown', function(e) {
        if(e.key === 'Escape' && modal.style.display === 'flex') {
            closeModal();
        }
    });

    // 控制下载按钮悬浮显示
    const downloadBtnContainer = document.querySelector('.download-btn-container');
    let lastScrollTop = 0;

    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const downloadBtnVisible = downloadBtn.offsetParent !== null;
        const controlsRect = document.querySelector('.controls').getBoundingClientRect();
        
        if (downloadBtnVisible) {
            if (scrollTop > lastScrollTop && scrollTop > 100 && controlsRect.bottom < 0) {
                downloadBtnContainer.classList.add('visible');
            } else {
                downloadBtnContainer.classList.remove('visible');
            }
            lastScrollTop = scrollTop;
        } else {
            downloadBtnContainer.classList.remove('visible');
        }
    });

    // 优化：当窗口改变大小时重新计算
    window.addEventListener('resize', function() {
        if (downloadBtn.offsetParent !== null) {
            const controlsRect = document.querySelector('.controls').getBoundingClientRect();
            if (controlsRect.bottom >= 0) {
                downloadBtnContainer.classList.remove('visible');
            }
        }
    });
}); 